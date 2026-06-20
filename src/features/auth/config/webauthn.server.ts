const RP_NAME = "RakuJot";

type WebAuthnRequestConfig = {
  rpName: string;
  rpID: string;
  origin: string;
};

const getEnv = (key: string): string => {
  return process.env[key]?.trim() ?? "";
};

const getRequestOrigin = (request: Request): string => {
  return new URL(request.url).origin;
};

const getRequestHostname = (request: Request): string => {
  return new URL(request.url).hostname;
};

export const getWebAuthnRequestConfig = (request: Request): WebAuthnRequestConfig => {
  const origin = getEnv("WEBAUTHN_ORIGIN") || getRequestOrigin(request);
  const rpID = getEnv("WEBAUTHN_RP_ID") || getRequestHostname(request);

  return {
    rpName: RP_NAME,
    rpID,
    origin,
  };
};
