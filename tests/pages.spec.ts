import { expect, test } from "@playwright/test";
import { seedAuthenticatedAdminSession } from "./helpers/session";

test.beforeEach(async ({ page }) => {
  await seedAuthenticatedAdminSession(page);
});

test("dashboard renders", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page.getByRole("heading", { name: /public health case dashboard/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /view more/i })).toBeVisible();
  await expect(page.getByText(/recent uploads/i)).toBeVisible();
});

test("upload page renders", async ({ page }) => {
  await page.goto("/upload");

  await expect(page.getByRole("heading", { name: /upload cif document/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /select document/i })).toBeVisible();
  await expect(page.getByText(/drop your document here/i)).toBeVisible();
});

test("case records page renders", async ({ page }) => {
  await page.goto("/case-review");

  await expect(page.getByRole("heading", { name: /case data review/i })).toBeVisible();
  await expect(page.getByText(/extracted structured fields/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /save record/i })).toBeVisible();
});
