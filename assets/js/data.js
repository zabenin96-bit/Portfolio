/*
 * Site content. Edit this file to change texts, categories, projects and brands.
 *
 * Category preview: a short muted loop (4–8 s, mp4/h264) in assets/video/ in
 * three sizes – 1280px (`preview`), 960px (`previewMedium`, full-width phone
 * tiles) and 640px (`previewSmall`, small tiles) – plus a
 * poster image (webp) in assets/img/ (`poster`). The site picks the size that
 * matches the tile on screen. Without them the tile shows a placeholder.
 *
 * Project video: upload the full video to Kinescope and paste its ID
 * (the part after kinescope.io/ in the share link) into `kinescope`.
 * `title` and `role` are shown under the video (`role`: what was done on it).
 */
window.SITE = {
  i18n: {
    ru: {
      metaTitle: "whereisyoursound – звук для рекламы, кино и анимации",
      sub: "Sound design studio",
      offer: "Звук для рекламы, кино и анимации – от саунд-дизайна и музыки до сведения.",
      ctaShort: "Обсудить проект",
      brandsLabel: "Бренды и проекты",
      workLabel: "Работы",
      previewNote: "[превью-петля]",
      who: "Обо мне",
      photoAlt: "Ната, основательница whereisyoursound",
      l1: "Я Ната, основательница whereisyoursound.",
      l2: "Пишу музыку и создаю звук проекта – от идеи до финального микса.",
      l3: "Работаю в тесной связке с режиссёром и командой: так звук попадает точно в замысел.",
      kicker: "Звук для вашего проекта",
      byMail: "Почта",
      cta: "Обсудить проект",
      credit: "Разработка сайта –",
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
      metaTitle: "whereisyoursound – sound for advertising, film and animation",
      sub: "Sound design studio",
      offer: "Sound for advertising, film and animation – from sound design and music to the final mix.",
      ctaShort: "Discuss a project",
      brandsLabel: "Brands and projects",
      workLabel: "Work",
      previewNote: "[preview loop]",
      who: "About",
      photoAlt: "Nata, founder of whereisyoursound",
      l1: "I’m Nata, founder of whereisyoursound.",
      l2: "I write music and create a project’s sound – from the idea to the final mix.",
      l3: "I work hand in hand with directors and teams, so the sound lands exactly on the vision.",
      kicker: "Sound for your project",
      byMail: "Email",
      cta: "Discuss a project",
      credit: "Website by",
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
      id: "commercials",
      title: { ru: "Реклама", en: "Commercials" },
      preview: "assets/video/commercials.mp4", previewSmall: "assets/video/commercials-640.mp4", previewMedium: "assets/video/commercials-960.mp4", poster: "assets/img/commercials.webp", tint: "#2a1714",
      projects: [
        { title: { ru: "MG Motor", en: "MG Motor" }, role: { ru: "музыка, саунд-дизайн, сведение", en: "music, sound design & mix" }, kinescope: "eMs3woezYncoaQpC2zwUKG", preview: "assets/video/projects/mgmotor.mp4?v=2", poster: "assets/img/projects/mgmotor.webp?v=2" },
        { title: { ru: "Л’Этуаль", en: "L’Étoile" }, role: { ru: "саунд-дизайн и сведение", en: "sound design & mix" }, kinescope: "weDc8LrJaGXVNJ3sDjhmgM", preview: "assets/video/projects/letoile.mp4?v=2", poster: "assets/img/projects/letoile.webp?v=2" },
        { title: { ru: "Буше", en: "Bushe" }, role: { ru: "саунд-дизайн, обработка голоса, сведение", en: "sound design, voice processing & mix" }, kinescope: "0VHYckipP1yFtUHgSroYtd", preview: "assets/video/projects/bushe.mp4?v=2", poster: "assets/img/projects/bushe.webp?v=2" },
        { title: { ru: "Яндекс Доставка", en: "Yandex Deliverer" }, role: { ru: "саунд-дизайн и сведение", en: "sound design & mix" }, kinescope: "sXrhE1wZFMQPPaN81Epi2b", preview: "assets/video/projects/yandex.mp4?v=2", poster: "assets/img/projects/yandex.webp?v=2" },
      ],
    },
    {
      id: "film",
      title: { ru: "Постпродакшн кино", en: "Film postproduction" },
      preview: "assets/video/film.mp4", previewSmall: "assets/video/film-640.mp4", previewMedium: "assets/video/film-960.mp4", poster: "assets/img/film.webp", tint: "#221c10",
      projects: [
        { title: { ru: "К свету", en: "To the Light" }, role: { ru: "реж. Меген Тарба, 2024", en: "dir. Megen Tarba, 2024" }, kinescope: "vCMDwcPHp7WzsmAkCkG2co", preview: "assets/video/projects/tothelight.mp4?v=2", poster: "assets/img/projects/tothelight.webp?v=2" },
        { title: { ru: "Встань на моё место", en: "Walk a Meter in My Shoes" }, role: { ru: "реж. Анна Маковская, 2026", en: "dir. Ann Makovsky, 2026" }, kinescope: "dqsyCEEmsUZM3GDEyG14AZ", preview: "assets/video/projects/walkameter.mp4?v=2", poster: "assets/img/projects/walkameter.webp?v=2" },
      ],
    },
    {
      id: "animation",
      title: { ru: "Анимация", en: "Animation" },
      preview: "assets/video/animation.mp4", previewSmall: "assets/video/animation-640.mp4", previewMedium: "assets/video/animation-960.mp4", poster: "assets/img/animation.webp", tint: "#14201a",
      projects: [
        { title: { ru: "0,5 самурая", en: "Half of Samurai" }, role: { ru: "саунд-дизайн", en: "sound design" }, kinescope: "wk3Aik8kNa2XgryingxbaV", preview: "assets/video/projects/samurai-sd.mp4?v=2", poster: "assets/img/projects/samurai-sd.webp?v=2" },
        { title: { ru: "0,5 самурая", en: "Half of Samurai" }, role: { ru: "саундтрек", en: "soundtrack" }, kinescope: "tkVSX6gJRMffjH9YfzfSNN", preview: "assets/video/projects/samurai-ost.mp4?v=2", poster: "assets/img/projects/samurai-ost.webp?v=2" },
        { title: { ru: "Бег", en: "Run" }, role: { ru: "саунд-дизайн и сведение", en: "sound design & mix" }, kinescope: "uiCY7LroVH4LZ3vKCAdEym", preview: "assets/video/projects/run.mp4?v=2", poster: "assets/img/projects/run.webp?v=2" },
      ],
    },
    {
      id: "vertical",
      title: { ru: "Вертикальный контент", en: "Vertical content" },
      format: "vertical",
      preview: "assets/video/vertical.mp4", previewSmall: "assets/video/vertical-640.mp4", previewMedium: "assets/video/vertical-960.mp4", poster: "assets/img/vertical.webp", tint: "#1d1528",
      projects: [
        { title: { ru: "MSI", en: "MSI" }, role: { ru: "саунд-дизайн и сведение", en: "sound design & mix" }, kinescope: "nZG4VdWbuistHaFSt1NDwi", preview: "assets/video/projects/msi.mp4?v=2", poster: "assets/img/projects/msi.webp?v=2" },
        { title: { ru: "М.Видео", en: "M.Video" }, role: { ru: "саунд-дизайн и сведение", en: "sound design & mix" }, kinescope: "wj4T7z24UWSFR2SjedVdWn", preview: "assets/video/projects/mvideo.mp4?v=2", poster: "assets/img/projects/mvideo.webp?v=2" },
      ],
    },
  ],
};
