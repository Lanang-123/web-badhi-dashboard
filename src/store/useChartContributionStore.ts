import { create } from "zustand";

interface ChartContributionState {
  monthlyData: number[];
  monthlyLabels: string[];
  contributorData: number[];
  contributorLabels: string[];
}

const useChartContributionStore = create<ChartContributionState>(() => ({
  monthlyData: [120, 200, 150, 80, 70, 90, 100],
  monthlyLabels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
  contributorData: [30, 25, 20, 15, 10],
  contributorLabels: ['User A', 'User B', 'User C', 'User D', 'User E'],
}));

export default useChartContributionStore;