import { DataList, HStack, IconButton } from "@chakra-ui/react";
import { Grid, LayoutList } from "lucide-react";

import { assetsManagerModel } from "./assets-manager-model";

export function AssetsToolbar() {
  const viewMode = assetsManagerModel.viewMode.value;
  const entries = assetsManagerModel.entries.value;

  return (
    <HStack justify="space-between" px={4} py={2} borderBottomWidth={1} w="full">
      <DataList.Root orientation="horizontal" size="sm">
        <DataList.Item>
          <DataList.ItemLabel>Assets</DataList.ItemLabel>
          <DataList.ItemValue>{entries.length} items</DataList.ItemValue>
        </DataList.Item>
      </DataList.Root>

      <HStack gap={1}>
        <IconButton
          aria-label="List view"
          size="sm"
          variant={viewMode === "list" ? "solid" : "ghost"}
          onClick={() => assetsManagerModel.setViewMode("list")}
        >
          <LayoutList size={16} />
        </IconButton>
        <IconButton
          aria-label="Grid view"
          size="sm"
          variant={viewMode === "grid" ? "solid" : "ghost"}
          onClick={() => assetsManagerModel.setViewMode("grid")}
        >
          <Grid size={16} />
        </IconButton>
      </HStack>
    </HStack>
  );
}
