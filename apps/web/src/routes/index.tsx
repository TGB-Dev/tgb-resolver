import { Box } from "@chakra-ui/react";
import { createFileRoute } from "@tanstack/react-router";
import { apiClient } from "@/lib/api.client";

export const Route = createFileRoute("/")({
  component: Home,
  loader: async () => {
    const res = await apiClient.get();
    return res.data;
  },
});

function Home() {
  const data = Route.useLoaderData();

  return (
    <Box>
      Hello World!
      {data}
    </Box>
  );
}
