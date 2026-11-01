# M4-07 v4.0 Release

- Release commit: `b96ed25d3ac7980430ae45b5d3b1ed7359ccdb5e`
- GitHub Actions run: `41294207436`
- Public top: https://onishi.github.io/shoot-mata/
- Fixed v4.0 route: https://onishi.github.io/shoot-mata/v4.0/
- Preserved routes: `/v3.4/`, `/v3.3/`, `/v3.2/`, `/v3.1/`, `/v3/`

The build job passed the locked install, Chrome runtime setup, full `npm run verify`, preserved-route build, seven-route artifact inspection and Pages upload. The deploy job passed GitHub Pages deployment and the live verification step.

The live verification fetched all seven routes with successful HTTP responses, found the `PALIMPSEST WAKE — v4.0` version marker at the top and `/v4.0/`, matched both `release.json` files to the release commit, and accepted the JavaScript and CSS MIME types. The same live check also passed independently from the development machine after the workflow completed.
