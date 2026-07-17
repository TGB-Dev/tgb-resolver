import { Box, Text, VStack } from "@chakra-ui/react";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <VStack minH="100dvh" align="center" justify="center" bg="bg.subtle" gap={4}>
      <Text fontSize="4xl" fontWeight="bold" fontFamily="mono">
        TGB Resolver
      </Text>
      <Box>
        <Link to="/control">
          <Text
            fontSize="lg"
            color="fg.muted"
            _hover={{ color: "fg", textDecoration: "underline" }}
          >
            Open Control Panel
          </Text>
        </Link>
      </Box>
    </VStack>
  );
}
