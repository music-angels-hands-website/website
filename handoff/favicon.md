# Site favicon

Date: 2026-10-18

The existing Music Angels Hands PNG logo is linked in index.html as the browser favicon and Apple touch icon. Relative asset URLs support both root and subdirectory hosting. A version query helps refresh browser icon caches. The existing Pages workflow already publishes assets, so no extra build or runtime settings are required. Deploy through the existing GitHub Pages workflow to make the change live.

Verified that the referenced PNG exists, both head links are present, and git diff --check passes.
