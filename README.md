# LZ 129 Hindenburg – begehbare 3D-Rekonstruktion

Begehbare Rekonstruktion des Luftschiffs LZ 129 „Hindenburg“ im Browser (Three.js, vollständig prozedural, ohne externe Modelle oder Texturen).

**Live:** https://trapanotto.github.io/hindenburg/

- Passagierdecks A und B, Führergondel, Kielgang, Axialgang, Maschinengondeln, Außenansicht
- Zustand 1936 und 1937 umschaltbar
- Bedienbare Steuerung in der Führergondel (Ruder, Maschinentelegrafen, Ballast, Gas)
- Szene am Ankermast in Lakehurst
- Infopunkte, Deckplan mit Teleport, Tageszeiten, Touch-Steuerung

## Lokal starten

```
npm install
npm run dev
```

## Genauigkeit

Hauptmaße, Ringstationen, Rumpfkontur und Grundrisse folgen öffentlich zugänglichen Quellen (siehe `research/`). Grundlage sind ausgemessene Rekonstruktionszeichnungen und Prospektpläne, keine Werkspläne; viele Details sind plausibel ergänzt. Die Hoheitszeichen am Leitwerk sind nicht dargestellt.
