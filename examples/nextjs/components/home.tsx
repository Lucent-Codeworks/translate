"use client";

import { useTranslate } from "@lucent-translate/react";
import Link from "next/link";
import { languages } from "@/i18n-shared";

export function Home() {
  const { t, locale } = useTranslate();

  return (
    <main>
      <h1>{t("home.title")}</h1>
      <p>{t("home.subtitle", { name: "Ada" })}</p>
      <nav style={{ display: "flex", gap: 8 }}>
        {languages.map((code) =>
          code === locale ? (
            <strong key={code}>{code}</strong>
          ) : (
            <Link key={code} href={`/${code}`}>
              {code}
            </Link>
          ),
        )}
      </nav>
    </main>
  );
}
