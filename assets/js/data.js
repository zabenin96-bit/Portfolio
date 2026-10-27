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
      metaTitle: "whereisyoursound – звук для кино, рекламы, анимации и игр",
      sub: "Sound design studio",
      brandsLabel: "Бренды и проекты",
      workLabel: "Работы",
      previewNote: "[превью-петля]",
      who: "Обо мне",
      photoAlt: "Ната, основательница whereisyoursound",
      l1: "Я Ната, основательница whereisyoursound.",
      l2: "Делаю звук под ключ для кино, рекламы, анимации и игр – от саунд-дизайна и музыки до сведения.",
      l3: "Работаю в тесной связке с режиссёром и командой: так звук попадает точно в замысел.",
      l4: "Студия в Тбилиси, проекты – по всему миру.",
      cta: "Есть идея? Напишите мне.",
      city: "Тбилиси",
      navWork: "Работы",
      navAbout: "Обо мне",
      navContact: "Контакты",
      navLabel: "Основная навигация",
      langLabel: "Язык",
      close: "Закрыть",
      watch: "Смотреть",
      soon: "Видео скоро появится",
      role: "музыка и саунд-дизайн",
    },
    en: {
      metaTitle: "whereisyoursound – sound for film, advertising, animation and games",
      sub: "Sound design studio",
      brandsLabel: "Brands and projects",
      workLabel: "Work",
      previewNote: "[preview loop]",
      who: "About",
      photoAlt: "Nata, founder of whereisyoursound",
      l1: "I’m Nata, founder of whereisyoursound.",
      l2: "I handle sound end to end for film, advertising, animation and games – from sound design and music to the final mix.",
      l3: "I work hand in hand with directors and their teams, so the sound lands exactly on the vision.",
      l4: "Based in Tbilisi, working worldwide.",
      cta: "Have an idea? Get in touch.",
      city: "Tbilisi",
      navWork: "Work",
      navAbout: "About",
      navContact: "Contact",
      navLabel: "Main navigation",
      langLabel: "Language",
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

  // format: "vertical" shows 9:16 cards (2 per row on phones, 4 on desktop)
  categories: [
    {
      id: "vertical",
      title: { ru: "Вертикальный контент", en: "Vertical content" },
      format: "vertical",
      preview: "assets/video/vertical.mp4", poster: "assets/img/vertical.webp", tint: "#1d1528",
      projects: [
        { title: { ru: "[Проект 1]", en: "[Project 1]" }, kinescope: "", poster: "" },
        { title: { ru: "[Проект 2]", en: "[Project 2]" }, kinescope: "", poster: "" },
        { title: { ru: "[Проект 3]", en: "[Project 3]" }, kinescope: "", poster: "" },
        { title: { ru: "[Проект 4]", en: "[Project 4]" }, kinescope: "", poster: "" },
      ],
    },
    {
      id: "games",
      title: { ru: "Игры", en: "Games" },
      preview: "assets/video/games.mp4", poster: "assets/img/games.webp", tint: "#121821",
      projects: [
        { title: { ru: "[Проект 1]", en: "[Project 1]" }, kinescope: "", poster: "" },
        { title: { ru: "[Проект 2]", en: "[Project 2]" }, kinescope: "", poster: "" },
        { title: { ru: "[Проект 3]", en: "[Project 3]" }, kinescope: "", poster: "" },
      ],
    },
    {
      id: "film",
      title: { ru: "Постпродакшн кино", en: "Film postproduction" },
      preview: "assets/video/film.mp4", poster: "assets/img/film.webp", tint: "#221c10",
      projects: [
        { title: { ru: "[Проект 1]", en: "[Project 1]" }, kinescope: "", poster: "" },
        { title: { ru: "[Проект 2]", en: "[Project 2]" }, kinescope: "", poster: "" },
        { title: { ru: "[Проект 3]", en: "[Project 3]" }, kinescope: "", poster: "" },
      ],
    },
    {
      id: "commercials",
      title: { ru: "Реклама", en: "Commercials" },
      preview: "assets/video/commercials.mp4", poster: "assets/img/commercials.webp", tint: "#2a1714",
      projects: [
        { title: { ru: "[Проект 1]", en: "[Project 1]" }, kinescope: "", poster: "" },
        { title: { ru: "[Проект 2]", en: "[Project 2]" }, kinescope: "", poster: "" },
        { title: { ru: "[Проект 3]", en: "[Project 3]" }, kinescope: "", poster: "" },
      ],
    },
    {
      id: "animation",
      title: { ru: "Анимация", en: "Animation" },
      preview: "assets/video/animation.mp4", poster: "assets/img/animation.webp", tint: "#14201a",
      projects: [
        { title: { ru: "[Проект 1]", en: "[Project 1]" }, kinescope: "", poster: "" },
        { title: { ru: "[Проект 2]", en: "[Project 2]" }, kinescope: "", poster: "" },
        { title: { ru: "[Проект 3]", en: "[Project 3]" }, kinescope: "", poster: "" },
      ],
    },
  ],
};
