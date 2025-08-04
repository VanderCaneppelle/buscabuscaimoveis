export default {
  name: 'BuscaBusca Imóveis',
  slug: 'buscabuscaimoveis',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'buscabuscaimoveis',
  ios: {
    bundleIdentifier: 'com.appsimples.app',
    infoPlist: {
      NSCameraUsageDescription: 'Este app precisa acessar a câmera para tirar fotos dos imóveis.',
      NSPhotoLibraryUsageDescription: 'Este app precisa acessar a galeria para selecionar fotos dos imóveis.',
      NSMicrophoneUsageDescription: 'Este app precisa acessar o microfone para gravar vídeos dos imóveis.',
    },
  },
  android: {
    package: 'com.appsimples.app',
    permissions: [
      'android.permission.CAMERA',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.RECORD_AUDIO',
    ],
  },
  plugins: [
    [
      'expo-image-picker',
      {
        photosPermission: 'O app precisa acessar suas fotos para selecionar imagens dos imóveis.',
        cameraPermission: 'O app precisa acessar a câmera para tirar fotos dos imóveis.',
      },
    ],
  ],
  extra: {
    eas: {
      projectId: '3d62b9b3-f6a9-47db-93db-666f037084e3',
    },
  },
}; 