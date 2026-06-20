# Welcome to Remix!

- 📖 [Remix docs](https://remix.run/docs)

## Development

Run the dev server:

```shellscript
npm run dev
```

### On-device embeddings in the PWA

The app can generate search embeddings in the browser with the ONNX model files mirrored to Vercel Blob.
The current browser embedding model is a small Japanese embedding model based on Ruri v3, uses Apache-2.0 licensing, and outputs 256-dimensional vectors.

The browser embedding code uses `@huggingface/transformers` from the app bundle. The ONNX model files are fetched at runtime from the configured Blob public URL and cached by the browser/PWA storage for later use. Queries are prefixed with `検索クエリ: ` and memo documents with `検索文書: ` to match Ruri v3 retrieval usage.

Required browser environment variables:

```env
VITE_BROWSER_EMBED_MODEL_HOST=https://<blob-public-host>/
VITE_BROWSER_EMBED_MODEL_ID=models/ruri-v3-30m-ONNX
```

`VITE_BROWSER_EMBED_MODEL_PATH_TEMPLATE` defaults to `{model}/`.
`VITE_BROWSER_EMBED_MODEL_DTYPE` defaults to `q8`, which loads `onnx/model_quantized.onnx`.
If the Blob copy uses `onnx/model.onnx`, set `VITE_BROWSER_EMBED_MODEL_DTYPE=fp32`.
If the Blob copy had to be renamed, keep `VITE_BROWSER_EMBED_MODEL_DTYPE=q8` and set `VITE_BROWSER_EMBED_MODEL_ONNX_FILE`, for example:

```env
VITE_BROWSER_EMBED_MODEL_ONNX_FILE=M_quantize.onnx
```

Do not mix embeddings from different models for semantic search; regenerate stored memo embeddings after switching providers. The client refreshes local memo embeddings gradually when memos are loaded.

## Deployment

First, build your app for production:

```sh
npm run build
```

Then run the app in production mode:

```sh
npm start
```

Now you'll need to pick a host to deploy it to.

### DIY

If you're familiar with deploying Node applications, the built-in Remix app server is production-ready.

Make sure to deploy the output of `npm run build`

- `build/server`
- `build/client`

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever css framework you prefer. See the [Vite docs on css](https://vitejs.dev/guide/features.html#css) for more information.
