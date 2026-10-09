# PHP, Blade & Livewire Formatter

## Features

- ⚡ **PSR-12 Compliant:** Automatically formats PHP sections according to PSR-12 standards.
- 🎨 **Tailwind CSS Sorting:** Sorts Tailwind utility classes cleanly in Blade templates.
- 🔄 **Livewire 4 Support:** Smart formatting and syntax awareness for Livewire components.
- 🛠️ **Format on Save:** Works seamlessly with VS Code's default `editor.formatOnSave`.

## Recommended VS Code Settings

Add the following to your `settings.json` to enable automatic formatting on save and optimize the completion experience for Blade and PHP files:

```json
{
  "editor.wordBasedSuggestions": "off",
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