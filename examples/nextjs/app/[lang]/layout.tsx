import { TranslateProvider } from "@lucent-translate/react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, languages, translateConfig } from "@/i18n";

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!languages.includes(lang)) return {};
  const { t } = await getTranslations(lang);
  return { title: t("home.title") };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!languages.includes(lang)) notFound();
  const { messages } = await getTranslations(lang);

  return (
    <html lang={lang}>
      <body>
        {/* Seeded with server-loaded messages: no fetch or flash on hydration. */}
        <TranslateProvider {...translateConfig()} locale={lang} messages={messages}>
          {children}
        </TranslateProvider>
      </body>
    </html>
  );
}
