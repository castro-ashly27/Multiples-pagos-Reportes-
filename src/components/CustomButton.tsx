import { ComponentProps } from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";

type CustomButtonProps = {
  title: string;
  iconName?: string;
  isSelected?: boolean;
  disabled?: boolean;
  direction?: "row" | "column";
  iconSize?: number;
} & ComponentProps<typeof Pressable>;

export default function CustomButton({
  title,
  iconName,
  isSelected,
  disabled,
  direction = "column",
  iconSize = 24,
  ...pressableProps
}: CustomButtonProps) {
  return (
    <Pressable
      {...pressableProps}
      disabled={disabled}
      style={[
        styles.button,
        { flexDirection: direction },
        isSelected && styles.selected,
        disabled && styles.disabled,
        pressableProps.style as any,
      ]}
    >
      {iconName && (
        <FontAwesome6 name={iconName} size={iconSize} color="white" />
      )}
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
    gap: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "500",
    textAlign: "center",
  },
  selected: {
    backgroundColor: "orange",
  },
  disabled: {
    backgroundColor: "gray",
  },
});
