# VisualTrace

Mobile application foundation for comparing before-and-after photographs with AI.
The current app contains a single Spanish introduction screen; comparison and AI
features have not been implemented.

## Stack

- Expo SDK 57, React Native, and TypeScript with strict checking.
- Expo Router with routes in `src/app/` and a Stack with hidden headers.
- Expo Go for development on iOS and Android.
- Spanish is the default interface language; English support is planned.
- Code and technical identifiers use English.

## Development

Install the locked dependencies:

```sh
npm ci
```

Start the development server:

```sh
npm start
```

For a physical device through a tunnel, including an iPhone with Expo Go:

```sh
npm start -- --go --tunnel
```

`@expo/ngrok` is retained for tunnel connections. The `android`, `ios`, and `web`
scripts provide the corresponding Expo launch shortcuts. The iOS simulator
requires macOS; a physical iPhone can connect to the tunnel from Windows.

## Validation

```sh
npx tsc --noEmit
npx expo-doctor
```

The `npm run lint` script is retained, but ESLint and its configuration have not
been set up. Running it can install and configure linting automatically.

## Project files

- `src/app/index.tsx`: current VisualTrace screen.
- `src/app/_layout.tsx`: root Stack navigation.
- `app.json`: Expo configuration, application identifiers, icons, and splash screen.
- `assets/`: only the assets referenced by the Expo configuration.
- `tsconfig.json`: strict TypeScript settings and Expo Router types.
- `.vscode/`: editor settings and the Expo Tools extension recommendation.

`node_modules/`, `.expo/`, `expo-env.d.ts`, builds, and generated native folders
are ignored by Git. Local environment files are ignored, with `.env.example`
allowed if needed later.
