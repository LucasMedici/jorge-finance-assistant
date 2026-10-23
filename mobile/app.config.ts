import "dotenv/config";

export default {
  expo: {
    name: "Jorge Assistant",
    slug: "finance-assistent-frontend",
    icon: "./src/assets/app-icon/app-icon.png",
    splash: {
      image: "./src/assets/app-icon/play_store_512.png",
      resizeMode: "contain",
      backgroundColor: "#31266C"
    },
    android: {
      package: "com.lucasmedici.financeassistent",
    },
    extra: {
      API_URL: process.env.API_URL,
      eas: {
        projectId: "50b9f938-af3f-4561-aaff-310292b391e3",
      },
    },
  },
};
