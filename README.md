# NEON ATLAS — квиз «страна ↔ столица»

Мини-игра для урока: ученики соотносят страну и её столицу. Слева плашки
с флагами, справа — фотографии достопримечательностей столиц.

## Играть

**https://inf-AD.github.io/neon-atlas/**

Игрок вводит имя или название команды и проходит четыре раунда по пять пар.
Пары идут от простых к сложным: в первом раунде Франция и Египет, в четвёртом —
Нидерланды, Индия, ОАЭ, Швейцария, Марокко.

Две ошибки — раунд закрыт, игра переходит к следующему. После четвёртого раунда
показывается статистика: имя игрока, сколько пар собрано, ошибки и время
каждого раунда плюс общее время.

Кнопка **Скачать Excel** сохраняет файл `.xlsx` с этой статистикой.
Кнопка **Отправить на почту** передаёт те же данные через FormSubmit.co на
адрес `kovalenko_09@mail.ru`; первое письмо сервис попросит подтвердить
ссылкой из него.

Клавиша `H` — подсказка, `Escape` — снять выбор.

## Что внутри

```
index.html   статическая сборка (её и отдаёт GitHub Pages)
style.css    оформление: светлый неон, стеклянные плашки
game.js      механика: раунды, лимит ошибок, таймеры, Excel
img/         40 файлов: 20 фото достопримечательностей + 20 флагов
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

20 пар «страна → столица → достопримечательность → короткий факт» лежат в
`src/data.php`. Раунды заданы константой `ROUND_PLAN`: четыре списка по пять
ключей, от простых стран к сложным. Лимит ошибок — `MAX_MISS`.

## Фотографии и лицензии

Все снимки и флаги взяты с [Wikimedia Commons](https://commons.wikimedia.org/).
Лицензии CC BY и CC BY-SA требуют указывать автора, поэтому внизу страницы есть
раскрывающийся список «Фотографии и флаги: авторы и лицензии»; те же данные
лежат в `src/credits.json`.

### Фотографии достопримечательностей

| Файл | Автор | Лицензия |
|---|---|---|
| Sheikh Zayed Masjid in Abu Dhabi, United Arab Emirates - panor | Rizwan Ullah Wazir | CC BY 3.0 |
| Parliament House at dusk, Canberra ACT.jpg | Thennicke | CC BY-SA 4.0 |
| Brasilia Congresso Nacional 05 2007 221.jpg | Mario Roberto Duran Ortiz | Public domain |
| Ottawa - Parliament Hill - Centre Block 04.JPG | Concierge.2C | CC BY-SA 3.0 |
| The Zytglogge clock tower.jpg | Dmitry A. Mottl | CC BY-SA 4.0 |
| The Forbidden City - Beijing 01 (4935434660).jpg | Ronnie Macdonald from Chelmsford, United King | CC BY 2.0 |
| Berlin, Brandenburger Tor -- 2019 -- 6326.jpg | Dietmar Rabich | CC BY-SA 4.0 |
| اهرامات الجيزه احد عجائب الدنيا السبعه.jpg | Ahmedrezzkk | CC BY-SA 4.0 |
| Anocheciendo - Puerta de Alcala - Madrid 02.jpg | Javier Perez Montes | CC BY-SA 4.0 |
| Eiffel Tower in 2022 01.jpg | Maksim Sokolov (maxergon.com) | CC BY-SA 4.0 |
| Palace of Westminster from the dome on Methodist Central Hall. | Colin | CC BY-SA 4.0 |
| Athens Acropolis Parthenon (27828101733).jpg | Gary Todd from Xinzheng, China | CC0 |
| India Gate, New Delhi by Shagil Kannur 6.jpg | Shagil Kannur | CC BY-SA 4.0 |
| Colosseum, Rome, Italy (Ank Kumar) 01.jpg | Ank Kumar | CC BY-SA 4.0 |
| Found Photo - Japan - Tokyo - Tokyo Tower 2 (32404777532).jpg | David Pirmann | CC BY 2.0 |
| Hassan Tower 01.jpg | Bernard Gagnon | CC BY-SA 3.0 |
| The Prinsengracht, Amsterdam (48356289032).jpg | Mustang Joe | CC0 |
| St. Basil's Cathedral - Moscow, Russian Federation - Summer 19 | Giorgio Galeotti | CC BY-SA 4.0 |
| Anitkabir Ankara.jpg | Lethiciasouza | CC BY-SA 4.0 |
| United States Capitol Building-1.jpg | Smash the Iron Cage | CC BY-SA 4.0 |

### Флаги

| Файл | Автор | Лицензия |
|---|---|---|
| Flag of the United Arab Emirates.svg | Abdulla Mohammed Al Maainah | Public domain |
| Flag of Australia.svg | Original: Ivor Evans, Leslie John Hawkins, Eg | Public domain |
| Flag of Brazil.svg | Wikimedia Commons | Public domain |
| Flag of Canada.svg | Created by George F. G. Stanley /  E Pluribus | Public domain |
| Flag of Switzerland.svg | Wikimedia Commons | Public domain |
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
| Flag of Morocco.svg | Wikimedia Commons | Public domain |
| Flag of the Netherlands.svg | Zscout370 | Public domain |
| Flag of Russia.svg | Peter the Great | Public domain |
| Flag of Turkey.svg | Wikimedia Commons | Public domain |
| Flag of the United States.svg | Uploaded by Dbenbenn; edited by users such as | Public domain |

## Лицензия

Учебный материал, свободно для использования на уроках. Фотографии — на
условиях лицензий, указанных выше.
