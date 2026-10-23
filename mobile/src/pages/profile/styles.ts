import { StyleSheet } from "react-native";
import { themas } from "../../global/themes";
import { fonts } from "../../global/fonts";

export const style = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themas.colors.primary,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },

  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: "#FFFFFF",
  },

  headerSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 2,
  },

  profileContent: {
    paddingHorizontal: 15,
    paddingVertical: 20,
  },

  avatarContainer: {
    alignItems: "center",
    marginBottom: 30,
  },

  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(141, 198, 62, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: themas.colors.secondary,
  },

  card: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },

  cardLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: 8,
  },

  cardValue: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: "#FFFFFF",
  },

  userName: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: themas.colors.secondary,
    marginBottom: 12,
  },

  textInput: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: "#FFFFFF",
    fontFamily: fonts.regular,
    fontSize: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(141, 198, 62, 0.3)",
  },

  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(141, 198, 62, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: "flex-start",
  },

  editButtonText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: themas.colors.secondary,
  },

  buttonGroup: {
    flexDirection: "row",
    gap: 10,
  },

  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },

  buttonSave: {
    backgroundColor: themas.colors.secondary,
  },

  buttonCancel: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },

  buttonText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: "#FFFFFF",
  },

  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#FF4444",
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 20,
  },

  logoutButtonText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: "#FFFFFF",
  },
});
