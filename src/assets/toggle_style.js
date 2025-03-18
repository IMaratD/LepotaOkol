document.addEventListener("DOMContentLoaded", function () {
    const toggleButton = document.getElementById("toggle-style");

    function changeFontStyle(newClass) {
        document.body.classList.remove("body-ustav", "body-poluu", "body-skoropis", "body-modern");
        document.body.classList.add(newClass);
        localStorage.setItem("selectedFontStyle", newClass);
    }

    toggleButton.addEventListener("click", function () {
        let currentStyle = localStorage.getItem("selectedFontStyle") || "body-modern";
        let styles = ["body-modern", "body-ustav", "body-poluu", "body-skoropis"];
        let nextStyle = styles[(styles.indexOf(currentStyle) + 1) % styles.length];

        changeFontStyle(nextStyle);
    });

    const savedStyle = localStorage.getItem("selectedFontStyle");
    if (savedStyle) {
        document.body.classList.add(savedStyle);
    }
});














// document.addEventListener("DOMContentLoaded", () => {
//   const toggleButton = document.getElementById("toggleFonts");
//   const fontOptions = document.getElementById("fontOptions");
//   const content = document.getElementById("content");

//   // Показать/скрыть кнопки выбора шрифта
//   toggleButton.addEventListener("click", () => {
//       fontOptions.classList.toggle("hidden");
//   });

//   // Обработчик смены шрифта
//   document.querySelectorAll(".font-option").forEach(button => {
//       button.addEventListener("click", (event) => {
//           const selectedFont = event.target.getAttribute("data-font");

//           content.style.opacity = "0"; // Исчезновение текста
//           setTimeout(() => {
//               content.style.fontFamily = getFontFamily(selectedFont);
//               content.style.opacity = "1"; // Плавное появление с новым шрифтом
//           }, 300);
//       });
//   });

//   function getFontFamily(fontKey) {
//       const fonts = {
//           ustav: "'Ustav', serif",
//           poluustav: "'Poluustav', serif",
//           skoropis: "'Skoropis', cursive",
//           modern: "'Old Standard TT', serif"
//       };
//       return fonts[fontKey] || fonts.modern;
//   }
// });

