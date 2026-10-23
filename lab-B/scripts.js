class Todo {
    constructor() {
        this.tasks = [];
        this.term = "";
        this.container = document.getElementById("tasks");
        this.message = document.getElementById("message");
        // POCZĄTEK fragmentu wykonanego przez Codex: odczyt i sprawdzanie zapisanych zadań.
        try {
            const saved = JSON.parse(localStorage.getItem("todo-tasks") || "[]");
            if (Array.isArray(saved)) {
                this.tasks = saved.filter(task => task && typeof task.text === "string" &&
                    typeof task.date === "string" && (!task.date || !isNaN(new Date(task.date).getTime())))
                    .map(task => ({ ...task, date: task.date && !task.date.includes("T")
                        ? task.date + "T23:59" : task.date }));
                localStorage.setItem("todo-tasks", JSON.stringify(this.tasks));
            }
        } catch (error) {
            this.message.textContent = "Nie udało się odczytać zapisanych zadań.";
        }
        // KONIEC fragmentu wykonanego przez Codex.
        this.draw();
    }

    validate(text, date) {
        const length = text.trim().length;

        if (length < 3 || length > 255) {
            return "Zadanie musi mieć od 3 do 255 znaków.";
        }

        const deadline = date && new Date(date);
        if (date && (isNaN(deadline.getTime()) || deadline <= new Date())) {
            return "Termin musi być pusty albo w przyszłości.";
        }
        return "";
    }

    save(redraw = true) {
        try {
            localStorage.setItem("todo-tasks", JSON.stringify(this.tasks));
        } catch (error) {
            this.message.textContent = "Nie udało się zapisać zadań w przeglądarce.";
        }
        if (redraw) {
            this.draw();
        }
    }

    add(text, date = "") {
        this.message.textContent = this.validate(text, date);
        if (this.message.textContent) {
            return false;
        }
        this.tasks.push({ text: text.trim(), date, completed: false });
        this.save();
        return true;
    }

    remove(task) {
        this.tasks = this.tasks.filter(item => item !== task);
        this.message.textContent = "";
        this.save();
    }

    edit(task, text, date, redraw = true) {
        this.message.textContent = this.validate(text, date === task.date ? "" : date);
        if (this.message.textContent) {
            return false;
        }
        task.text = text.trim();
        task.date = date;
        this.save(redraw);
        return true;
    }

    getFilteredTasks() {
        const term = this.term.toLocaleLowerCase("pl");

        if (term.length < 2) {
            return this.tasks;
        }

        return this.tasks.filter(task => task.text.toLocaleLowerCase("pl").includes(term));
    }

    // POCZĄTEK fragmentu wykonanego przez Codex: podświetlanie wyszukiwanego tekstu.
    highlight(element, text) {
        const term = this.term.toLocaleLowerCase("pl");
        const lowerText = text.toLocaleLowerCase("pl");
        let start = 0;
        let index = term.length >= 2 ? lowerText.indexOf(term) : -1;

        while (index !== -1) {
            element.append(document.createTextNode(text.slice(start, index)));
            const mark = document.createElement("mark");
            mark.textContent = text.slice(index, index + term.length);
            element.append(mark);
            start = index + term.length;
            index = lowerText.indexOf(term, start);
        }
        element.append(document.createTextNode(text.slice(start)));
    }

    // KONIEC fragmentu wykonanego przez Codex.

    // POCZĄTEK fragmentu wykonanego przez Codex: edycja tytułu lub daty w miejscu wyświetlania.
    startEditing(content, task, field) {
        const editor = document.createElement("input");
        editor.className = content.className + " task-editor";
        editor.type = field === "date" ? "datetime-local" : "text";
        editor.value = task[field];
        if (field === "text") {
            editor.maxLength = 255;
        }
        editor.setAttribute("aria-label", field === "date" ? "Termin zadania" : "Treść zadania");
        content.replaceWith(editor);

        let cancelled = false;

        editor.addEventListener("blur", () => {
            if (!cancelled) {
                const text = field === "text" ? editor.value : task.text;
                const date = field === "date" ? editor.value : task.date;
                this.edit(task, text, date, false);
            }

            content.replaceChildren();
            if (field === "text") {
                this.highlight(content, task.text);
            } else {
                content.textContent = task.date
                    ? new Date(task.date).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" }) : "Bez terminu";
            }
            editor.replaceWith(content);
            if (!this.getFilteredTasks().includes(task)) {
                this.draw();
            }
        });

        editor.addEventListener("keydown", event => {
            if (event.key === "Enter") {
                event.preventDefault();
                event.target.blur();
            }
            if (event.key === "Escape") {
                event.preventDefault();
                cancelled = true;
                editor.blur();
            }
        });

        editor.focus();
    }

    // KONIEC fragmentu wykonanego przez Codex.

    draw() {
        this.container.replaceChildren();
        const tasks = this.getFilteredTasks();
        if (!tasks.length) {
            this.container.textContent = "Brak zadań do wyświetlenia.";
        }

        tasks.forEach(task => {
            const row = document.createElement("div");
            row.className = "task";
            row.classList.toggle("completed", !!task.completed);

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = !!task.completed;
            checkbox.setAttribute("aria-label", "Oznacz jako wykonane: " + task.text);
            checkbox.addEventListener("change", () => {
                task.completed = checkbox.checked;
                this.save();
            });

            const content = document.createElement("div");
            content.className = "task-content";
            content.tabIndex = 0;
            content.title = "Kliknij, aby edytować";
            this.highlight(content, task.text);

            const date = document.createElement("span");
            date.className = "task-date";
            // POCZĄTEK fragmentu wykonanego przez Codex: formatowanie terminu zadania.
            date.textContent = task.date
                ? new Date(task.date).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" }) : "Bez terminu";
            // KONIEC fragmentu wykonanego przez Codex.

            // POCZĄTEK fragmentu wykonanego przez Codex: uruchamianie edycji daty i tytułu myszą lub klawiaturą.
            date.tabIndex = 0;
            date.title = "Kliknij, aby edytować termin";
            date.addEventListener("click", () => this.startEditing(date, task, "date"));
            date.addEventListener("keydown", event => {
                if (event.key === "Enter") {
                    this.startEditing(date, task, "date");
                }
            });
            content.addEventListener("click", () => this.startEditing(content, task, "text"));
            content.addEventListener("keydown", event => {
                if (event.key === "Enter") {
                    this.startEditing(content, task, "text");
                }
            });
            // KONIEC fragmentu wykonanego przez Codex.

            const remove = document.createElement("button");
            remove.type = "button";
            remove.textContent = "Usuń";
            remove.addEventListener("click", () => this.remove(task));

            row.append(checkbox, content, date, remove);
            this.container.append(row);
        });
    }
}

const todo = new Todo();
document.todo = todo;

document.getElementById("search").addEventListener("input", event => {
    todo.term = event.target.value;
    todo.draw();
});

document.getElementById("add-form").addEventListener("submit", event => {
    event.preventDefault();
    const text = document.getElementById("task-text");
    const date = document.getElementById("task-date");
    if (todo.add(text.value, date.value)) {
        event.target.reset();
        text.focus();
    }
});
