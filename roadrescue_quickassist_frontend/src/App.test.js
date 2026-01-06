import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders RoadRescue QuickAssist brand", () => {
  render(<App />);
  expect(screen.getByText(/RoadRescue QuickAssist/i)).toBeInTheDocument();
});
