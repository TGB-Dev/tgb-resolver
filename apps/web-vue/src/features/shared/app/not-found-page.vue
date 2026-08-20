<script setup lang="ts">
import { Box, VStack } from "@styled-system/jsx";</script>

<template>
  <VStack minH="100dvh" justify="center" gap="2" bg="bg.subtle" p="6">
    <Box fontSize="lg" fontWeight="medium" color="fg">
      404 <Box as="span" color="fg.muted" mx="2">|</Box> Not found
    </Box>

    <Box fontSize="sm" color="fg.muted">
      This page is not available or does not exist. Please check the URL or return to the
      homepage.
    </Box>
  </VStack>
</template>