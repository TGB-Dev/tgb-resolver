import { Button, Code, Icon, Stack, Text, VStack } from "@chakra-ui/react";
import { Copy } from "lucide-react";
import { useState } from "react";

export function NotFoundPage() {
  return (
    <VStack minH="100dvh" align="center" justify="center" gap={2} bg="bg.subtle">
      <Text fontSize="lg" fontWeight="medium" color="fg">
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
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyError = () => {
    const errorData = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
    navigator.clipboard.writeText(JSON.stringify(errorData, null, 2));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

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
          <Button
            size="xs"
            colorPalette="gray"
            variant="surface"
            onClick={handleCopyError}
            w="fit-content"
          >
            <Icon as={Copy} w={3} h={3} mr={1} />
            {isCopied ? "Đã sao chép" : "Sao chép lỗi"}
          </Button>

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
