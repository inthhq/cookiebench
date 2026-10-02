# Shared article assets

The courtyard illustration is original CookieBench material, dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). `../scripts/generate-reference-assets.py` generates the PNG and article catalog using only Python's standard library. The fixed seed and source geometry make the output reproducible. `manifest.json` records source, license, dimensions, byte lengths, and SHA-256 digests.

The image, article catalog, and reading-list module provide the same ordinary page work in every framework and its baseline. They contain no timed busy loops, request delays, or response padding. The PNG's grain is part of the illustration. The fixture server serves the shared assets with consistent compression and cache headers.
