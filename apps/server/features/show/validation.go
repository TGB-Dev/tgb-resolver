package show

import (
	"fmt"
	"math"

	"tgb-resolver/server/features/shared/domain"
)

func ensureWritable(st domain.ShowState) error {
	if st.TimelineMode == domain.TimelineRo {
		return fmt.Errorf("timeline is read-only")
	}
	return nil
}

func ensureFiniteOrNull(v *float64, name string) error {
	if v != nil && (math.IsNaN(*v) || math.IsInf(*v, 0)) {
		return fmt.Errorf("%s must be a finite number", name)
	}
	return nil
}
