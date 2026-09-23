import Script from "next/script";

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("computebrief:theme");
    var theme = stored === "light" || stored === "dark"
      ? stored
      : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    if (theme === "dark") document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export function ThemeScript() {
  // beforeInteractive in the root layout is the pattern Next.js docs call out
  // explicitly (https://nextjs.org/docs/app/api-reference/components/script) —
  // the no-before-interactive-script-outside-document lint rule predates App
  // Router support for it and doesn't special-case app/layout.tsx.
  return (
    // eslint-disable-next-line @next/next/no-before-interactive-script-outside-document
    <Script id="theme-init" strategy="beforeInteractive">
      {THEME_INIT_SCRIPT}
    </Script>
  );
}
