// SSR 用スタブ（vite.config.ts で browserEmbeddingService の代わりに解決される）
export async function computeBrowserEmbedding(_text: string, _kind?: string): Promise<number[] | null> {
  return null;
}
