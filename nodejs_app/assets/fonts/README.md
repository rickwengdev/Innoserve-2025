# Fonts for PDF rendering

To render Chinese (CJK) text in generated PDFs, place a Unicode font here, e.g.:

- NotoSansCJKtc-Regular.otf (recommended)
- NotoSansTC-Regular.otf

The server will auto-detect and use the first available font. If no font is provided, non-ASCII characters will be replaced with `?` to avoid encoding errors.
