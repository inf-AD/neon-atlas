# NEON ATLAS — квиз «страна ↔ столица»

Мини-игра для урока: ученики соотносят страну и её столицу. Слева плашки
с флагами, справа — фотографии достопримечательностей столиц.

Стиль: киберпанк, светлый неоновый фон, плашки-карточки.

## Играть

**https://inf-AD.github.io/neon-atlas/**

Выбрать страну слева, затем столицу справа. Верная пара загорается зелёным,
ошибка не отнимает пару, но считается. Клавиши: `H` — подсказка, `R` — сброс,
`N` — новый раунд.

## Что внутри

```
index.html   статическая сборка (её и отдаёт GitHub Pages)
style.css    оформление: светлый неон, стеклянные плашки
game.js      механика раунда: выбор, проверка, таймер, итоги
img/         32 файла: 16 фото достопримечательностей + 16 флагов
src/         исходники на PHP — то же самое, но раунд собирает сервер
```

`src/` для игры на Pages не нужен: это исходники. PHP-версия полезна, если
хочется менять пары в `src/data.php` и не править HTML руками.

### PHP-версия локально

Нужен PHP 8+. В папке `src/`:

```
php -S 127.0.0.1:8080
```

затем открыть <http://127.0.0.1:8080/>. В Windows проще запустить
`src/start.bat` — он найдёт PHP сам и откроет браузер.

### Пересобрать статическую страницу

```
cd src
php build_static.php
```

Скрипт запишет `index.html` в папку `src/`; скопируйте его в корень репозитория.

## Данные

16 пар «страна → столица → достопримечательность → короткий факт» лежат в
`src/data.php`. Раунд — 6 пар, выбираются и перемешиваются случайно.

## Фотографии и лицензии

Все снимки и флаги взяты с [Wikimedia Commons](https://commons.wikimedia.org/).
Лицензии CC BY и CC BY-SA требуют указывать автора, поэтому внизу страницы есть
раскрывающийся список «Фотографии и флаги: авторы и лицензии»; те же данные
лежат в `src/credits.json`.

### Фотографии достопримечательностей

| Файл | Автор | Лицензия |
|---|---|---|
| Sheikh Zayed Masjid in Abu Dhabi, United Arab Emirates - pan | Rizwan Ullah Wazir | CC BY 3.0 |
| Parliament House at dusk, Canberra ACT.jpg | Thennicke | CC BY-SA 4.0 |
| Ottawa - Parliament Hill - Centre Block 04.JPG | Concierge.2C | CC BY-SA 3.0 |
| The Forbidden City - Beijing 01 (4935434660).jpg | Ronnie Macdonald from Chelmsford, United King | CC BY 2.0 |
| Berlin, Brandenburger Tor -- 2019 -- 6326.jpg | Dietmar Rabich | CC BY-SA 4.0 |
| اهرامات الجيزه احد عجائب الدنيا السبعه.jpg | Ahmedrezzkk | CC BY-SA 4.0 |
| Anocheciendo - Puerta de Alcala - Madrid 02.jpg | Javier Perez Montes | CC BY-SA 4.0 |
| Eiffel Tower in 2022 01.jpg | Maksim Sokolov (maxergon.com) | CC BY-SA 4.0 |
| Palace of Westminster from the dome on Methodist Central Hal | Colin | CC BY-SA 4.0 |
| Athens Acropolis Parthenon (27828101733).jpg | Gary Todd from Xinzheng, China | CC0 |
| India Gate, New Delhi by Shagil Kannur 6.jpg | Shagil Kannur | CC BY-SA 4.0 |
| Colosseum, Rome, Italy (Ank Kumar) 01.jpg | Ank Kumar | CC BY-SA 4.0 |
| Found Photo - Japan - Tokyo - Tokyo Tower 2 (32404777532).jp | David Pirmann | CC BY 2.0 |
| The Prinsengracht, Amsterdam (48356289032).jpg | Mustang Joe | CC0 |
| St. Basil's Cathedral - Moscow, Russian Federation - Summer  | Giorgio Galeotti | CC BY-SA 4.0 |
| United States Capitol Building-1.jpg | Smash the Iron Cage | CC BY-SA 4.0 |

### Флаги

| Файл | Автор | Лицензия |
|---|---|---|
| Flag of the United Arab Emirates.svg | Abdulla Mohammed Al Maainah | Public domain |
| Flag of Australia.svg | Original: Ivor Evans, Leslie John Hawkins, Eg | Public domain |
| Flag of Canada.svg | Created by George F. G. Stanley /  E Pluribus | Public domain |
| Flag of the People's Republic of China.svg | Zeng Liansong | Public domain |
| Flag of Germany.svg | User:SKopp, User:Madden, and other users | Public domain |
| Flag of Egypt.svg | See File history below for details. | Public domain |
| Flag of Spain.svg | RelShot 263, Echando una mano; earlier versio | Public domain |
| Flag of France.svg | Original: Unknown Vector:  SKopp | Public domain |
| Flag of the United Kingdom.svg | Original: Acts of Union 1800 Vector:  Yaddah | Public domain |
| Flag of Greece.svg | Unknown authorUnknown author | Public domain |
| Flag of India.svg | Government of India | Public domain |
| Flag of Italy.svg | See below. | Public domain |
| Flag of Japan.svg | Various | Public domain |
| Flag of the Netherlands.svg | Zscout370 | Public domain |
| Flag of Russia.svg | Peter the Great | Public domain |
| Flag of the United States.svg | Uploaded by Dbenbenn; edited by users such as | Public domain |

## Лицензия

Учебный материал, свободно для использования на уроках. Фотографии — на
условиях лицензий, указанных выше.
