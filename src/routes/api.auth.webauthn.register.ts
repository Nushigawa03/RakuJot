/**
 * WebAuthn 登録 API エンドポイント
 * POST /api/auth/webauthn/register
 *
 * phase: 'challenge' — 登録チャレンジを生成して返す
 * phase: 'verify'    — アテステーション応答を検証してクレデンシャルを保存
 */

import type { ActionFunction } from "react-router";
import { requireAuthenticatedUserId } from "~/features/auth/utils/authMode.server";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { prisma } from "~/db.server";
import { getWebAuthnRequestConfig } from "~/features/auth/config/webauthn.server";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

type StoredRegistrationChallenge = {
  challenge: string;
  origin: string;
  rpID: string;
  expiresAt: number;
};

// チャレンジの一時保存（本番では Redis 等が望ましい）
const challengeStore = new Map<string, StoredRegistrationChallenge>();

const getStoredChallenge = (userId: string): StoredRegistrationChallenge | null => {
  const stored = challengeStore.get(userId);
  if (!stored) return null;

  if (stored.expiresAt < Date.now()) {
    challengeStore.delete(userId);
    return null;
  }

  return stored;
};

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const userId = await requireAuthenticatedUserId(request);
    const body = await request.json();
    const { phase } = body;

    if (phase === "status") {
      const credentialCount = await prisma.webAuthnCredential.count({
        where: { userId },
      });

      return Response.json({
        supported: true,
        registered: credentialCount > 0,
        credentialCount,
      });
    }

    if (phase === "challenge") {
      const { rpName, rpID, origin } = getWebAuthnRequestConfig(request);
      // ユーザーの既存クレデンシャルを取得
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { webauthnCredentials: true },
      });

      if (!user) {
        return Response.json({ error: "ユーザーが見つかりません" }, { status: 404 });
      }

      const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userID: Buffer.from(user.id, "utf-8"),
        userName: user.email ?? user.id,
        userDisplayName: user.name || user.email || "RakuJot user",
        attestationType: "none",
        excludeCredentials: user.webauthnCredentials.map((cred) => ({
          id: cred.credentialId,
          transports: cred.transports as any[],
        })),
        authenticatorSelection: {
          residentKey: "required",
          userVerification: "required",
        },
      });

      // チャレンジを保存
      challengeStore.set(userId, {
        challenge: options.challenge,
        origin,
        rpID,
        expiresAt: Date.now() + CHALLENGE_TTL_MS,
      });

      return Response.json(options);
    }

    if (phase === "verify") {
      const stored = getStoredChallenge(userId);
      if (!stored) {
        return Response.json({ error: "チャレンジが見つかりません。もう一度お試しください。" }, { status: 400 });
      }

      const { attestationResponse } = body;

      const verification = await verifyRegistrationResponse({
        response: attestationResponse,
        expectedChallenge: stored.challenge,
        expectedOrigin: stored.origin,
        expectedRPID: stored.rpID,
        requireUserVerification: true,
      });

      if (!verification.verified || !verification.registrationInfo) {
        return Response.json({ error: "検証に失敗しました" }, { status: 400 });
      }

      const { credential } = verification.registrationInfo;

      const existingCredential = await prisma.webAuthnCredential.findUnique({
        where: { credentialId: credential.id },
      });

      if (existingCredential) {
        challengeStore.delete(userId);
        if (existingCredential.userId === userId) {
          return Response.json({ success: true, message: "このパスキーは登録済みです" });
        }
        return Response.json({ error: "このパスキーは別のユーザーに登録済みです" }, { status: 409 });
      }

      // クレデンシャルをDBに保存
      await prisma.webAuthnCredential.create({
        data: {
          userId,
          credentialId: credential.id,
          publicKey: Buffer.from(credential.publicKey),
          counter: BigInt(credential.counter),
          transports: (body.attestationResponse?.response?.transports as string[]) || [],
        },
      });

      // チャレンジを削除
      challengeStore.delete(userId);

      return Response.json({ success: true, message: "生体認証が登録されました" });
    }

    return Response.json({ error: "無効な phase です" }, { status: 400 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("WebAuthn register error:", error);
    return Response.json({ error: "生体認証の登録に失敗しました" }, { status: 500 });
  }
};
