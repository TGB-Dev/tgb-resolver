import { Code, Stack, Text, VStack } from "@chakra-ui/react";

export function NotFoundPage() {
  return (
    <VStack minH="100dvh" align="center" justify="center" gap={2} bg="bg.subtle">
      <Text fontSize="lg" fontWeight="medium" color="fg" fontFamily="mono">
        404{" "}
        <Text as="span" color="fg.muted" mx={2}>
          |
        </Text>{" "}
        Không tìm thấy
      </Text>

      <Text fontSize="sm" color="fg.muted">
        Trang bạn đang tìm hiện không tồn tại.
      </Text>
    </VStack>
  );
}

export function ErrorPage({ error }: { error: Error }) {
  return (
    <VStack minH="100dvh" align="center" justify="center" bg="bg.subtle" p={6}>
      <Stack
        w="full"
        maxW="4xl"
        gap={4}
        rounded="md"
        bg="bg.panel"
        p={6}
        shadow="md"
        borderWidth={1}
        borderColor="border.error"
      >
        <Stack gap={1}>
          <Text fontSize="lg" fontWeight="medium" color="fg.error">
            Có lỗi xảy ra
          </Text>
          <Text fontSize="sm" color="fg.muted">
            Vui lòng thử lại sau hoặc liên hệ với bộ phận kỹ thuật để được hỗ trợ thêm.
          </Text>
        </Stack>

        <Stack gap={2}>
          <Text fontSize="sm" fontWeight="bold" color="fg">
            {error.name}
          </Text>
          <Code p={3} whiteSpace="pre-wrap" display="block">
            {error.message}
          </Code>
          {error.stack ? (
            <Code p={3} whiteSpace="pre-wrap" display="block" fontSize="xs">
              {error.stack}
            </Code>
          ) : null}
        </Stack>
      </Stack>
    </VStack>
  );
}
