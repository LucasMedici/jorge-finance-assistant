import "dotenv/config";

export default {
  expo: {
    name: "Jorge Assistant",
    slug: "finance-assistent-frontend",
    version: "2.0.0",
    icon: "./src/assets/app-icon/v2/jorge_icone_loja_1024.png",
    splash: {
      image: "./src/assets/v2/jorge_corpo_inteiro.png",
      resizeMode: "contain",
      backgroundColor: "#31266C"
    },
    android: {
      package: "com.lucasmedici.financeassistent",
      versionCode: 2,
      // Ícone adaptativo: camadas de 108dp, o desenho da frente fica no círculo seguro de 66dp do centro
      adaptiveIcon: {
        foregroundImage: "./src/assets/app-icon/v2/jorge_icone_android_frente.png",
        backgroundImage: "./src/assets/app-icon/v2/jorge_icone_android_fundo.png",
        monochromeImage: "./src/assets/app-icon/v2/jorge_icone_android_monocromatico.png",
        backgroundColor: "#31266C",
      },
    },
    extra: {
      API_URL: process.env.API_URL,
      eas: {
        projectId: "50b9f938-af3f-4561-aaff-310292b391e3",
      },
    },
  },
};
