# SonicVerse — Kozmik Evren

Müzikle değişen, içinde uçulabilen 3D evren. Three.js + TypeScript + Web Audio API.

## Çalıştırma

```bash
npm install
npm run dev
```

Tarayıcıdan yerel adrese girin. MP3/WAV dosyası yükleyip **Oynat** düğmesine basın. Masaüstünde WASD hareket, Q/E yükselme/alçalma, fareyi sürükleyerek bakış; dokunmatik cihazda sol bölge hareket, sağ bölge bakış içindir.

`npm run build` ile derleme kontrolü yapılır. Müzik tarayıcıdan dışarı yüklenmez. iPad Safari gerçek cihaz testi henüz yapılmadı.

## Kozmik Evren v0.3

- Audius üzerinden popüler müzikler ve şarkı arama
- Yerel müzik dosyalarıyla çalışma
- Bas, orta ve tiz için Web Audio FFT analizi
- GLSL shader tabanlı üç katmanlı nebula
- Parıltılı yıldızlar ve parçacık tabanlı plazma çekirdeği
- Bas değişimlerine tepki veren genişleyen enerji halkaları
- Mobilde daha düşük geometri yoğunluğu

### Kontrol

```bash
git pull origin main
npm install
npm run build
npm run dev
```

**Not:** Audius ses akışının Web Audio API ile analiz edilebilmesi için akış sunucusunun CORS izni vermesi gerekir. Bu koşul sağlanmıyorsa yerel dosya yüklemeyi kullanın. Shader performansı ve iPad Safari uyumluluğu gerçek cihazda henüz doğrulanmadı.
