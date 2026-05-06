import { ComponentProps } from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";

type CustomButtonProps = {
  title: string;
  iconName?: string;
  isSelected?: boolean;
  disabled?: boolean;
} & ComponentProps<typeof Pressable>;

export default function CustomButton({
  title,
  iconName,
  isSelected,
  disabled,
  ...pressableProps
}: CustomButtonProps) {
  return (
    <Pressable
      {...pressableProps}
      style={[
        styles.button,
        isSelected && styles.selected,
        disabled && styles.disabled,
        pressableProps.style as any,
      ]}
    >
      {iconName && <FontAwesome6 name={iconName} size={24} color="white" />}
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#0ab546",
    padding: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
  },
  selected: {
    backgroundColor: "orange",
  },
  disabled: {
    backgroundColor: "gray",
  },
});
