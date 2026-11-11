const MOTO_G04S_BUILD_ARCH = "arm64-v8a";

module.exports = ({ config }) => {
  const requestedBuildArch = process.env.VISUALTRACE_ANDROID_BUILD_ARCH;

  if (!requestedBuildArch) {
    return config;
  }

  if (requestedBuildArch !== MOTO_G04S_BUILD_ARCH) {
    throw new Error(
      `Unsupported VISUALTRACE_ANDROID_BUILD_ARCH: ${requestedBuildArch}. ` +
        `Expected ${MOTO_G04S_BUILD_ARCH}.`,
    );
  }

  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      [
        "expo-build-properties",
        {
          android: {
            buildArchs: [MOTO_G04S_BUILD_ARCH],
          },
        },
      ],
    ],
  };
};
