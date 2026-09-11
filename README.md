# Son Parsel

Mobil, tur tabanlı küçük şehir strateji oyunu. 6×6 arazi, 30 tur, 30 bina, 12 proje ve önceden haber verilen 8 şehir olayı.

## Çalıştırma

`index.html` dosyasını tarayıcıda açın veya bu dizini herhangi bir statik sunucuyla yayınlayın. Derleme, paket kurulumu ve harici servis gerekmez. Dosya dizilimi korunmalıdır; JavaScript ve CSS ayrı dosyalardır. Mevcut GitHub Pages kök dizinden yayınlamaya devam edebilir.

- `index.html`: anlamsal arayüz ve diyaloglar
- `styles.css`: mobil düzen, kartlar, parseller ve erişilebilir odak stilleri
- `js/data.js`: 30 bina, 12 proje, 8 olay, haritalar ve hedefler
- `js/engine.js`: saf oyun kuralları, ekonomi, deterministik kart çekimi, önizleme ve kayıt doğrulaması
- `js/app.js`: DOM etkileşimleri, cihazda kayıt, rehber ve ilerleme
- `tests/regression.cjs`: kural ve arayüz akışı regresyonları

## Kurallar

Her tur bir bina yerleştirilir, proje uygulanır veya tasarrufla 2 para alınır. Bir kart seçip parsele dokunmak henüz hamleyi tüketmez. Etki önizlemesi onaylanır, ardından yeni kartları açmak için sonraki tura geçilir. Bu geçişe kadar hamle geri alınabilir.

Komşuluk sadece dört ana yöndedir. Enerji açığı dönem gelirini %65'e indirir (minimum 3). Belediye 4 enerji ve 6 temel gelir sağlar. Her 5 hamlede ilan edilmiş olay etkinleşir ve gelir bütçeye eklenir. Etkin olay sonraki gelir dönemine kadar sürer. Olaylar binaları kalıcı silmez. 30. turun gelir dönemi de uygulanır.

Puan: nüfus ×8 + mutluluk ×4 + dönem geliri ×3 + kalan para + tamamlanan hedef başına 30 − enerji açığı başına 8. Son puan geçici olay etkileri hariç hesaplanır ve en az 0 olur.

Tam havuz bütün 30 binayı sunar. Keşif ilk oyunda 12 temel bina kullanır, tamamlanan ilk iki şehirle diğer katmanları açar. Projeler uygun hedef varsa gelebilir. Bir, iki ve üç tamamlanmış şehir sırasıyla nehir, göl ve vadi haritalarını açar. Tamamlanan şehir sayısı skor şartına bağlı değildir.

Şehir ve profil yalnız bu cihazın tarayıcısında `son-parsel-game-v1` ve `son-parsel-profile-v1` anahtarlarına kaydedilir. Sunucuya veri gönderilmez. Önceki Marble oyununun kayıtları okunmaz. Menüye dönmek şehri silmez; yeni şehir için tamamlanmamış kayıt varsa onay gerekir.

## Doğrulama

Node 22+ ile `node tests/regression.cjs`.

Testler tüm kartların kural kapsamını, yasal hedefleri, önizleme/hamle eşitliğini, geri almayı, ekonomi ve olayları, 4 haritada 60 tam oyunu, kayıt doğrulamasını ve arayüz akışlarını kapsar. UI testleri DOM stub kullanır; tarayıcı yerleşimi, gerçek telefon kullanımı ve görsel kaliteyi doğrulamaz. Sayısal denge ilk oynanabilir sürüm içindir; gerçek oyuncu geri bildirimine göre ayarlanmalıdır.
