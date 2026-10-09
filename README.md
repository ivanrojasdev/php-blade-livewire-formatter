# PHP, Blade & Livewire Formatter

## Prerequisites

This extension relies on **PHP-CS-Fixer** under the hood to format your PHP code according to PSR-12 and custom rules. 

> ⚠️ **Important:** You must have **PHP-CS-Fixer** installed on your system and accessible via your environment path (or configured in VS Code settings) for this extension to work.

---

### Step 1: Install PHP-CS-Fixer

Choose **one** of the following methods to install PHP-CS-Fixer:

#### Global Installation via Composer (Recommended)
If you already have [Composer](https://getcomposer.org/) installed, run the following command in your terminal:

```bash
composer global require friendsofphp/php-cs-fixer
```

Make sure your global Composer `bin` directory is added to your system's `PATH` variable:


* **macOS / Linux:** `~/.composer/vendor/bin` or `~/.config/composer/vendor/bin`
* **Windows:** `%USERPROFILE%\AppData\Roaming\Composer\vendor\bin`

### Step 2: Verify Installation

```bash
php-cs-fixer --version
```

## Features

- ⚡ **PSR-12 Compliant:** Automatically formats PHP sections according to PSR-12 standards.
- 🎨 **Tailwind CSS Sorting:** Sorts Tailwind utility classes cleanly in Blade templates.
- 🔄 **Livewire 4 Support:** Smart formatting and syntax awareness for Livewire components.
- 🛠️ **Format on Save:** Works seamlessly with VS Code's default `editor.formatOnSave`.

## Recommended VS Code Settings

Add the following to your `settings.json` to enable automatic formatting on save for Blade and PHP files:

```json
{
  "[blade]": {
    "editor.defaultFormatter": "irodev.php-blade-livewire-formatter",
    "editor.formatOnSave": true
  },
  "[php]": {
    "editor.defaultFormatter": "irodev.php-blade-livewire-formatter",
    "editor.formatOnSave": true
  }
}
```

## Issues & Feedback

If you find a bug or have a feature request, please open an issue on [GitHub Issues](https://github.com/ivanrojasdev/php-blade-livewire-formatter/issues).

## License

This project is licensed under the MIT License.