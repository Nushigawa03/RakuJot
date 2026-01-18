import { describe, it, expect } from 'vitest';
import { normalizeTagName } from './normalizeTagName';

describe('normalizeTagName', () => {
    it('前後の空白を除去する', () => {
        expect(normalizeTagName('  タグ  ')).toBe('タグ');
    });

    it('大文字を小文字に変換する', () => {
        expect(normalizeTagName('ABC')).toBe('abc');
        expect(normalizeTagName('Tag')).toBe('tag');
    });

    it('全角英数字を半角に変換する', () => {
        expect(normalizeTagName('ＡＢＣ')).toBe('abc');
        expect(normalizeTagName('１２３')).toBe('123');
        expect(normalizeTagName('Ｔａｇ')).toBe('tag');
    });

    it('内部の空白を除去する', () => {
        expect(normalizeTagName('tag name')).toBe('tagname');
        expect(normalizeTagName('タグ 名')).toBe('タグ名');
    });

    it('複合的な変換を正しく処理する', () => {
        expect(normalizeTagName('  Ｔａｇ　Ｎａｍｅ  ')).toBe('tagname');
        expect(normalizeTagName('ＡＢＣＤ１２３')).toBe('abcd123');
    });

    it('空文字列を処理する', () => {
        expect(normalizeTagName('')).toBe('');
    });

    it('日本語タグをそのまま保持する', () => {
        expect(normalizeTagName('日本語タグ')).toBe('日本語タグ');
    });
});
