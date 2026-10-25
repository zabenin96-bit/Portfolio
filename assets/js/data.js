/*
 * Site content. Edit this file to change texts, categories, projects and brands.
 *
 * Category preview: put a short muted loop (3–5 s, ~1 MB, mp4/h264) into
 * assets/video/ and a poster image (webp/jpg) into assets/img/, then set
 * `preview` and `poster` below. Without them the tile shows a placeholder.
 *
 * Project video: upload the full video to Kinescope and paste its ID
 * (the part after kinescope.io/ in the share link) into `kinescope`.
 */
window.SITE = {
  i18n: {
    ru: {
      metaTitle: "whereisyoursound — музыка и саунд-дизайн",
      sub: "Музыка · Саунд-дизайн",
      brandsLabel: "Бренды и проекты",
      workLabel: "Работы",
      previewNote: "[превью-петля]",
      who: "Обо мне",
      l1: "Я Наталья — композитор и саунд-дизайнер",
      l2: "из Тбилиси. Вместе с клиентами ищу новые",
      l3: "способы рассказывать истории звуком:",
      l4: "для рекламы, брендов, игр и кино.",
      cta: "Есть идея? Напишите мне.",
      city: "Тбилиси",
      navWork: "Работы",
      navAbout: "Обо мне",
      navContact: "Контакты",
      navLabel: "Основная навигация",
      langLabel: "Язык",
      themeLabel: "Сменить тему",
      close: "Закрыть",
      watch: "Смотреть",
      soon: "Видео скоро появится",
      role: "музыка и саунд-дизайн",
    },
    en: {
      metaTitle: "whereisyoursound — music & sound design",
      sub: "Music · Sound design",
      brandsLabel: "Brands and projects",
      workLabel: "Work",
      previewNote: "[preview loop]",
      who: "About",
      l1: "I'm Natalia, a composer and sound designer",
      l2: "based in Tbilisi. Together with clients I look",
      l3: "for new ways to tell stories through sound —",
      l4: "for advertising, brands, games and film.",
      cta: "Have an idea? Get in touch.",
      city: "Tbilisi",
      navWork: "Work",
      navAbout: "About",
      navContact: "Contact",
      navLabel: "Main navigation",
      langLabel: "Language",
      themeLabel: "Toggle theme",
      close: "Close",
      watch: "Watch",
      soon: "Video coming soon",
      role: "music & sound design",
    },
  },

  brands: {
    ru: [
      { names: ["Kérastase", "MSI", "Hyundai", "Л’Этуаль", "Яндекс", "М.Видео", "MG Motor", "Буше", "Coca-Cola"], note: "звук для видео · совместно с продакшенами" },
      { names: ["Мексика", "Австралия", "Испания"], note: "показы на кинофестивалях" },
      { names: ["Disney+ Hotstar", "Salto TV"], note: "стриминг" },
    ],
    en: [
      { names: ["Kérastase", "MSI", "Hyundai", "L’Étoile", "Yandex", "M.Video", "MG Motor", "Bushe", "Coca-Cola"], note: "sound for video · in collaboration with production studios" },
      { names: ["Mexico", "Australia", "Spain"], note: "film festival screenings" },
      { names: ["Disney+ Hotstar", "Salto TV"], note: "streaming" },
    ],
  },

  categories: [
    {
      id: "commercial",
      title: { ru: "Реклама", en: "Commercial" },
      preview: "", poster: "", tint: "#2a1714",
      projects: [
        { title: { ru: "[Проект 1]", en: "[Project 1]" }, kinescope: "", poster: "" },
        { title: { ru: "[Проект 2]", en: "[Project 2]" }, kinescope: "", poster: "" },
        { title: { ru: "[Проект 3]", en: "[Project 3]" }, kinescope: "", poster: "" },
      ],
    },
    {
      id: "film",
      title: { ru: "Кино", en: "Film" },
      preview: "", poster: "", tint: "#121821",
      projects: [
        { title: { ru: "[Проект 1]", en: "[Project 1]" }, kinescope: "", poster: "" },
        { title: { ru: "[Проект 2]", en: "[Project 2]" }, kinescope: "", poster: "" },
      ],
    },
    {
      id: "streaming",
      title: { ru: "Стриминг", en: "Streaming" },
      preview: "", poster: "", tint: "#1d1528",
      projects: [
        { title: { ru: "[Проект 1]", en: "[Project 1]" }, kinescope: "", poster: "" },
        { title: { ru: "[Проект 2]", en: "[Project 2]" }, kinescope: "", poster: "" },
      ],
    },
    {
      id: "fashion",
      title: { ru: "Fashion", en: "Fashion" },
      preview: "", poster: "", tint: "#1a1a1a",
      projects: [
        { title: { ru: "[Проект 1]", en: "[Project 1]" }, kinescope: "", poster: "" },
        { title: { ru: "[Проект 2]", en: "[Project 2]" }, kinescope: "", poster: "" },
      ],
    },
    {
      id: "music",
      title: { ru: "Музыка", en: "Music" },
      preview: "", poster: "", tint: "#221c10",
      projects: [
        { title: { ru: "[Проект 1]", en: "[Project 1]" }, kinescope: "", poster: "" },
        { title: { ru: "[Проект 2]", en: "[Project 2]" }, kinescope: "", poster: "" },
      ],
    },
  ],
};
