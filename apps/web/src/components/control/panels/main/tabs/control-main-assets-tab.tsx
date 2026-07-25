import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  generatedClient,
  tgbResolverServerFeaturesShowGetShowEndpointOptions,
} from "@tgb-resolver/contracts";
import { useEffect } from "react";

import { AssetsManager } from "@/features/assets-manager/assets-manager";
import { assetsManagerModel } from "@/features/assets-manager/assets-manager-model";
import { controlShowQueryKey } from "@/features/control/realtime-handler";

export function ControlMainAssetsTab() {
  const queryClient = useQueryClient();

  const showQuery = useQuery({
    ...tgbResolverServerFeaturesShowGetShowEndpointOptions({ client: generatedClient }),
    queryKey: controlShowQueryKey(),
  });

  useEffect(() => {
    assetsManagerModel.setInvalidateCache(() => {
      queryClient.invalidateQueries({ queryKey: controlShowQueryKey() });
    });
  }, [queryClient]);

  useEffect(() => {
    if (showQuery.data) {
      assetsManagerModel.applyShowState(showQuery.data);
    }
  }, [showQuery.data]);

  return <AssetsManager />;
}
