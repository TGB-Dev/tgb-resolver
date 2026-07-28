import { Heading as ChakraHeading, type HeadingProps } from "@chakra-ui/react";

export function Heading({ children, ...props }: HeadingProps) {
  return (
    <ChakraHeading fontSize="3xl" color="colorPalette.fg" {...props}>
      {children}
    </ChakraHeading>
  );
}
