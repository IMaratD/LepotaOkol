document.body.style.fontFamily = "'PonomarUnicode', sans-serif";


document.getElementById("toggle-style").addEventListener("click", function() {
    let description = document.getElementById("project-description");
    if (description.style.fontFamily === "'Old Standard TT', serif") {
        description.style.fontFamily = "Arial, sans-serif";
    } else {
        description.style.fontFamily = "'Old Standard TT', serif";
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const content = document.getElementById("content");
    const fontOptions = document.querySelectorAll(".font-option");

    // Функция смены шрифта
    function changeFont(fontClass) {
        content.className = ""; // Удаляем предыдущий стиль
        content.classList.add(fontClass);
        localStorage.setItem("selectedFont", fontClass); // Сохраняем выбор
    }

    // Устанавливаем сохраненный стиль после перезагрузки
    const savedFont = localStorage.getItem("selectedFont");
    if (savedFont) {
        changeFont(savedFont);
    }

    // Добавляем обработчики событий на кнопки
    fontOptions.forEach(button => {
        button.addEventListener("click", () => {
            const fontClass = button.getAttribute("data-font");
            changeFont(fontClass);
        });
    });
});
