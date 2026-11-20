import { expect, test } from "@playwright/test";

test("la page d'accueil s'affiche aux couleurs du thème OCTOGON DARK", async ({ page }) => {
  await page.goto("/");

  const html = page.locator("html");
  await expect(html).toHaveAttribute("lang", "fr");
  await expect(html).toHaveAttribute("data-mode", "live");

  const colors = await page.evaluate(() => {
    const body = getComputedStyle(document.body);
    const root = getComputedStyle(document.documentElement);
    return {
      background: body.backgroundColor,
      text: body.color,
      accent: root.getPropertyValue("--accent").trim(),
      font: body.fontFamily,
    };
  });

  expect(colors.background).toBe("rgb(10, 11, 14)");
  expect(colors.text).toBe("rgb(243, 244, 246)");
  expect(colors.accent.toLowerCase()).toBe("#e11d48");
  expect(colors.font.toLowerCase()).toContain("geist");

  // Le mode DAILY redéfinit l'accent sans recharger la page.
  await page.evaluate(() => document.documentElement.setAttribute("data-mode", "daily"));
  const daily = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--accent").trim(),
  );
  expect(daily.toLowerCase()).toBe("#d97706");
});
