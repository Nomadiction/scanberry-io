import { createContext, useContext } from 'react';

export type Locale = 'en' | 'ru' | 'es' | 'de';

const translations = {
  // Home
  'home.subtitle': { en: 'Blueberry plant diagnostics', ru: 'Диагностика кустов голубики', es: 'Diagnóstico de plantas de arándano', de: 'Diagnostik für Heidelbeerpflanzen' },
  'home.scans': { en: 'Scans', ru: 'Снимки', es: 'Escaneos', de: 'Scans' },
  'home.healthy': { en: 'Healthy', ru: 'Здоровые', es: 'Sanas', de: 'Gesund' },
  'home.avgHealth': { en: 'Avg Health', ru: 'Среднее здоровье', es: 'Salud media', de: 'Ø Gesundheit' },
  'home.tapToScan': { en: 'Tap to scan a plant', ru: 'Нажмите, чтобы отсканировать растение', es: 'Toca para escanear una planta', de: 'Tippe, um eine Pflanze zu scannen' },
  'home.recent': { en: 'Recent', ru: 'Недавние', es: 'Recientes', de: 'Letzte' },
  'home.viewAll': { en: 'View All', ru: 'Все', es: 'Ver todos', de: 'Alle anzeigen' },
  'home.noAnalyses': { en: 'No analyses yet', ru: 'Анализов пока нет', es: 'Aún no hay análisis', de: 'Noch keine Analysen' },
  'home.noAnalysesDesc': { en: 'Tap the button above to scan your first plant', ru: 'Нажмите кнопку выше, чтобы отсканировать первое растение', es: 'Toca el botón de arriba para escanear tu primera planta', de: 'Tippe auf den Button oben, um deine erste Pflanze zu scannen' },

  // Scan
  'scan.title': { en: 'Scan Plant', ru: 'Сканирование', es: 'Escanear planta', de: 'Pflanze scannen' },
  'scan.heading': { en: 'Analyze Your Plant', ru: 'Проанализируйте растение', es: 'Analiza tu planta', de: 'Pflanze analysieren' },
  'scan.desc': { en: 'Take a photo or choose from gallery to diagnose your blueberry plant', ru: 'Сделайте снимок или выберите фото из галереи, чтобы провести диагностику голубики', es: 'Toma una foto o selecciónala de la galería para diagnosticar tu planta de arándano', de: 'Mache ein Foto oder wähle eines aus der Galerie, um deine Heidelbeerpflanze zu untersuchen' },
  'scan.camera': { en: 'Camera', ru: 'Камера', es: 'Cámara', de: 'Kamera' },
  'scan.cameraDesc': { en: 'Take a new photo', ru: 'Сделать новый снимок', es: 'Tomar una foto nueva', de: 'Neues Foto aufnehmen' },
  'scan.gallery': { en: 'Gallery', ru: 'Галерея', es: 'Galería', de: 'Galerie' },
  'scan.galleryDesc': { en: 'Choose existing photo', ru: 'Выбрать готовое фото', es: 'Elegir una foto existente', de: 'Vorhandenes Foto auswählen' },
  'scan.tipsTitle': { en: 'Tips for best results', ru: 'Как получить лучший результат', es: 'Consejos para obtener mejores resultados', de: 'Tipps für die besten Ergebnisse' },
  'scan.tipLight': { en: 'Good lighting', ru: 'Хорошее освещение', es: 'Buena iluminación', de: 'Gute Beleuchtung' },
  'scan.tipLightDesc': { en: 'Use natural daylight, avoid flash', ru: 'Снимайте при дневном свете, без вспышки', es: 'Utiliza luz natural y evita el flash', de: 'Tageslicht nutzen und auf Blitz verzichten' },
  'scan.tipFocus': { en: 'Keep in focus', ru: 'Чёткий фокус', es: 'Mantén el enfoque', de: 'Klarer Fokus' },
  'scan.tipFocusDesc': { en: 'Tap to focus before shooting', ru: 'Коснитесь экрана для фокусировки перед съёмкой', es: 'Toca la pantalla para enfocar antes de disparar', de: 'Vor der Aufnahme zum Fokussieren tippen' },
  'scan.tipFull': { en: 'Full plant', ru: 'Куст целиком', es: 'Planta completa', de: 'Gesamte Pflanze' },
  'scan.tipFullDesc': { en: 'Capture the entire bush', ru: 'В кадре должен быть весь куст', es: 'Encuadra el arbusto en su totalidad', de: 'Den gesamten Strauch im Bild erfassen' },
  'scan.tipShadow': { en: 'No shadows', ru: 'Без теней', es: 'Sin sombras', de: 'Keine Schatten' },
  'scan.tipShadowDesc': { en: 'Avoid harsh shadows on leaves', ru: 'Избегайте резких теней на листьях', es: 'Evita las sombras marcadas sobre las hojas', de: 'Harte Schatten auf den Blättern vermeiden' },

  // Loading
  'loading.title': { en: 'Analyzing Plant', ru: 'Анализируем растение', es: 'Analizando la planta', de: 'Pflanze wird analysiert' },
  'loading.subtitle': { en: 'Running ML pipeline...', ru: 'Запускаем ML-пайплайн…', es: 'Ejecutando el pipeline de ML…', de: 'ML-Pipeline läuft…' },
  'loading.step1': { en: 'Detecting plant', ru: 'Обнаруживаем растение', es: 'Detectando la planta', de: 'Pflanze wird erkannt' },
  'loading.step2': { en: 'Classifying health state', ru: 'Определяем состояние здоровья', es: 'Clasificando el estado de salud', de: 'Gesundheitszustand wird klassifiziert' },
  'loading.step3': { en: 'Segmenting damage areas', ru: 'Сегментируем зоны повреждений', es: 'Segmentando las áreas dañadas', de: 'Schadensbereiche werden segmentiert' },
  'loading.step4': { en: 'Computing metrics', ru: 'Рассчитываем метрики', es: 'Calculando las métricas', de: 'Metriken werden berechnet' },
  'loading.failed': { en: 'Analysis failed', ru: 'Не удалось выполнить анализ', es: 'No se pudo completar el análisis', de: 'Analyse fehlgeschlagen' },
  'loading.finalizing': { en: 'Finalizing results...', ru: 'Формируем итоговый результат…', es: 'Preparando los resultados finales…', de: 'Ergebnisse werden zusammengestellt…' },

  // Result
  'result.title': { en: 'Results', ru: 'Результаты', es: 'Resultados', de: 'Ergebnisse' },
  'result.healthScore': { en: 'Health Score', ru: 'Индекс здоровья', es: 'Índice de salud', de: 'Gesundheitsindex' },
  'result.damageArea': { en: 'Damage Area', ru: 'Площадь поражения', es: 'Área afectada', de: 'Schadensfläche' },
  'result.visualEvidence': { en: 'Visual Evidence', ru: 'Визуальные признаки', es: 'Evidencia visual', de: 'Visuelle Befunde' },
  'result.probabilities': { en: 'Classification Probabilities', ru: 'Вероятности классов', es: 'Probabilidades de clasificación', de: 'Klassenwahrscheinlichkeiten' },
  'result.damageBreakdown': { en: 'Damage Breakdown', ru: 'Структура повреждений', es: 'Desglose de los daños', de: 'Schadensverteilung' },
  'result.details': { en: 'Details', ru: 'Подробности', es: 'Detalles', de: 'Details' },
  'result.processingTime': { en: 'Processing Time', ru: 'Время обработки', es: 'Tiempo de procesamiento', de: 'Verarbeitungszeit' },
  'result.analysisId': { en: 'Analysis ID', ru: 'ID анализа', es: 'ID del análisis', de: 'Analyse-ID' },
  'result.pipeline': { en: 'Pipeline', ru: 'Пайплайн', es: 'Pipeline', de: 'Pipeline' },
  'result.recommendations': { en: 'Recommended Actions', ru: 'Рекомендуемые действия', es: 'Acciones recomendadas', de: 'Empfohlene Maßnahmen' },
  'result.scanAnother': { en: 'Scan Another Plant', ru: 'Отсканировать другое растение', es: 'Escanear otra planta', de: 'Weitere Pflanze scannen' },
  'result.notFound': { en: 'Analysis Not Found', ru: 'Анализ не найден', es: 'Análisis no encontrado', de: 'Analyse nicht gefunden' },
  'result.notFoundDesc': { en: 'The requested analysis could not be found in your history.', ru: 'Указанный анализ отсутствует в вашей истории.', es: 'No hemos encontrado el análisis solicitado en tu historial.', de: 'Die angeforderte Analyse wurde in deinem Verlauf nicht gefunden.' },
  'result.backHome': { en: 'Back to Home', ru: 'На главную', es: 'Volver al inicio', de: 'Zurück zur Startseite' },
  'result.aiAnalysis': { en: 'AI Analysis', ru: 'ИИ-анализ', es: 'Análisis con IA', de: 'KI-Analyse' },
  'result.detectionOverlay': { en: 'Detection + classification overlay', ru: 'Наложение детекции и классификации', es: 'Superposición de detección y clasificación', de: 'Überlagerung: Erkennung + Klassifikation' },
  'result.originalPhoto': { en: 'Original Photo', ru: 'Исходное фото', es: 'Foto original', de: 'Originalfoto' },
  'result.uploadedImage': { en: 'Uploaded image', ru: 'Загруженное изображение', es: 'Imagen subida', de: 'Hochgeladenes Bild' },
  'result.segmentationMask': { en: 'Segmentation Mask', ru: 'Маска сегментации', es: 'Máscara de segmentación', de: 'Segmentierungsmaske' },
  'result.pixelDamageMap': { en: 'Per-pixel damage map', ru: 'Попиксельная карта повреждений', es: 'Mapa de daños por píxel', de: 'Pixelgenaue Schadenskarte' },

  // History
  'history.title': { en: 'History', ru: 'История', es: 'Historial', de: 'Verlauf' },
  'history.search': { en: 'Search analyses...', ru: 'Поиск по анализам…', es: 'Buscar análisis…', de: 'Analysen durchsuchen…' },
  'history.all': { en: 'All', ru: 'Все', es: 'Todos', de: 'Alle' },
  'history.favorites': { en: 'Favorites', ru: 'Избранное', es: 'Favoritos', de: 'Favoriten' },
  'history.results': { en: 'results', ru: 'результатов', es: 'resultados', de: 'Ergebnisse' },
  'history.result': { en: 'result', ru: 'результат', es: 'resultado', de: 'Ergebnis' },
  'history.noAnalyses': { en: 'No Analyses Yet', ru: 'Анализов пока нет', es: 'Aún no hay análisis', de: 'Noch keine Analysen' },
  'history.noAnalysesDesc': { en: 'Start scanning plants to see your analysis history here', ru: 'Отсканируйте первое растение — и здесь появится история ваших анализов', es: 'Comienza a escanear plantas y tu historial de análisis aparecerá aquí', de: 'Scanne Pflanzen — dein Analyseverlauf erscheint hier' },
  'history.startFirst': { en: 'Start First Scan', ru: 'Начать первое сканирование', es: 'Iniciar el primer escaneo', de: 'Ersten Scan starten' },
  'history.noResults': { en: 'No Analyses', ru: 'Анализов нет', es: 'Sin análisis', de: 'Keine Analysen' },
  'history.noResultsDesc': { en: 'No analyses found in this category yet', ru: 'В этой категории пока нет анализов', es: 'Todavía no hay análisis en esta categoría', de: 'In dieser Kategorie liegen noch keine Analysen vor' },

  // Settings
  'settings.title': { en: 'Settings', ru: 'Настройки', es: 'Ajustes', de: 'Einstellungen' },
  'settings.theme': { en: 'Theme', ru: 'Тема', es: 'Tema', de: 'Design' },
  'settings.light': { en: 'Light', ru: 'Светлая', es: 'Claro', de: 'Hell' },
  'settings.dark': { en: 'Dark', ru: 'Тёмная', es: 'Oscuro', de: 'Dunkel' },
  'settings.system': { en: 'System', ru: 'Системная', es: 'Sistema', de: 'Systemstandard' },
  'settings.language': { en: 'Language', ru: 'Язык', es: 'Idioma', de: 'Sprache' },
  'settings.about': { en: 'About', ru: 'О приложении', es: 'Acerca de', de: 'Über die App' },
  'settings.aboutText': {
    en: 'AI-powered plant diagnostics for blueberry (Vaccinium corymbosum L.) using deep learning and computer vision.',
    ru: 'Диагностика голубики (Vaccinium corymbosum L.) на основе глубокого обучения и компьютерного зрения.',
    es: 'Diagnóstico de plantas de arándano (Vaccinium corymbosum L.) basado en aprendizaje profundo y visión por computador.',
    de: 'KI-gestützte Diagnostik für die Heidelbeere (Vaccinium corymbosum L.) auf Basis von Deep Learning und Computer Vision.',
  },
  'settings.version': { en: 'Version', ru: 'Версия', es: 'Versión', de: 'Version' },
  'settings.detection': { en: 'Detection', ru: 'Детекция', es: 'Detección', de: 'Erkennung' },
  'settings.classification': { en: 'Classification', ru: 'Классификация', es: 'Clasificación', de: 'Klassifikation' },
  'settings.segmentation': { en: 'Segmentation', ru: 'Сегментация', es: 'Segmentación', de: 'Segmentierung' },

  // Status labels
  'status.healthy': { en: 'Healthy', ru: 'Здоровое', es: 'Sana', de: 'Gesund' },
  'status.stress': { en: 'Stress', ru: 'Стресс', es: 'Estrés', de: 'Stress' },
  'status.mold': { en: 'Mold', ru: 'Плесень', es: 'Moho', de: 'Schimmelbefall' },
  'status.dry': { en: 'Dry', ru: 'Усыхание', es: 'Sequedad', de: 'Trockenheit' },

  // Status descriptions
  'status.healthy.desc': {
    en: 'No signs of disease or stress detected. The plant is in good condition.',
    ru: 'Признаков заболевания или стресса не выявлено. Растение в хорошем состоянии.',
    es: 'No se han detectado signos de enfermedad ni estrés. La planta se encuentra en buen estado.',
    de: 'Keine Anzeichen von Krankheit oder Stress festgestellt. Die Pflanze befindet sich in gutem Zustand.',
  },
  'status.stress.desc': {
    en: 'Physiological stress detected — chlorosis or discoloration on leaves.',
    ru: 'Выявлен физиологический стресс: хлороз или изменение окраски листьев.',
    es: 'Se ha detectado estrés fisiológico: clorosis o decoloración foliar.',
    de: 'Physiologischer Stress festgestellt: Chlorose oder Verfärbung der Blätter.',
  },
  'status.mold.desc': {
    en: 'Fungal infection detected on the leaf surface. Treatment recommended.',
    ru: 'На поверхности листьев выявлена грибковая инфекция. Рекомендуется незамедлительная обработка.',
    es: 'Se detecta una infección fúngica en la superficie de las hojas. Se recomienda iniciar tratamiento.',
    de: 'Pilzbefall auf der Blattoberfläche festgestellt. Behandlung wird empfohlen.',
  },
  'status.dry.desc': {
    en: 'Drought stress and tissue necrosis detected. Immediate action needed.',
    ru: 'Обнаружены засушный стресс и некроз тканей. Необходимы безотлагательные меры.',
    es: 'Se detectan estrés hídrico y necrosis de los tejidos. Se requiere una intervención inmediata.',
    de: 'Trockenstress und Gewebenekrose festgestellt. Sofortiges Eingreifen ist erforderlich.',
  },

  // Severity levels
  'severity.good': { en: 'Good', ru: 'Хорошее', es: 'Bueno', de: 'Gut' },
  'severity.attention': { en: 'Attention', ru: 'Внимание', es: 'Atención', de: 'Achtung' },
  'severity.warning': { en: 'Warning', ru: 'Предупреждение', es: 'Advertencia', de: 'Warnung' },
  'severity.critical': { en: 'Critical', ru: 'Критическое', es: 'Crítico', de: 'Kritisch' },

  // Confidence
  'confidence.high': { en: 'High certainty', ru: 'Высокая достоверность', es: 'Alta confianza', de: 'Hohe Zuverlässigkeit' },
  'confidence.moderate': { en: 'Moderate certainty', ru: 'Средняя достоверность', es: 'Confianza moderada', de: 'Mittlere Zuverlässigkeit' },
  'confidence.low': { en: 'Low certainty — consider rescanning', ru: 'Низкая достоверность — рекомендуем повторить сканирование', es: 'Confianza baja: se recomienda repetir el escaneo', de: 'Geringe Zuverlässigkeit — erneutes Scannen empfohlen' },

  // Card metrics
  'card.health': { en: 'Health', ru: 'Здоровье', es: 'Salud', de: 'Gesundheit' },
  'card.damage': { en: 'Damage', ru: 'Поражение', es: 'Daño', de: 'Schaden' },
  'card.time': { en: 'Time', ru: 'Время', es: 'Tiempo', de: 'Zeit' },

  // Confirm dialog
  'confirm.deleteTitle': { en: 'Delete this analysis?', ru: 'Удалить этот анализ?', es: '¿Eliminar este análisis?', de: 'Diese Analyse löschen?' },
  'confirm.deleteDesc': { en: "It will be removed from your history and the server. You can't undo this.", ru: 'Анализ будет удалён из истории и с сервера. Это действие нельзя отменить.', es: 'Se eliminará de tu historial y del servidor. Esta acción no se puede deshacer.', de: 'Die Analyse wird aus deinem Verlauf und vom Server entfernt. Dieser Vorgang kann nicht rückgängig gemacht werden.' },
  'confirm.delete': { en: 'Delete', ru: 'Удалить', es: 'Eliminar', de: 'Löschen' },
  'confirm.keep': { en: 'Keep', ru: 'Оставить', es: 'Conservar', de: 'Behalten' },
  'confirm.cancel': { en: 'Cancel', ru: 'Отмена', es: 'Cancelar', de: 'Abbrechen' },

  // Next steps
  'steps.healthy.1': { en: 'No pathological changes detected. Continue standard monitoring at 7–10 day intervals.', ru: 'Патологических изменений не выявлено. Продолжайте плановый осмотр с интервалом 7–10 дней.', es: 'No se observan cambios patológicos. Mantenga el monitoreo habitual cada 7–10 días.', de: 'Keine pathologischen Veränderungen festgestellt. Routinekontrollen im Abstand von 7–10 Tagen fortführen.' },
  'steps.healthy.2': { en: 'Maintain current irrigation and fertilization protocols.', ru: 'Сохраняйте текущий режим полива и подкормок.', es: 'Mantenga el régimen actual de riego y fertilización.', de: 'Den aktuellen Bewässerungs- und Düngeplan beibehalten.' },
  'steps.healthy.3': { en: 'Document baseline condition for longitudinal comparison.', ru: 'Зафиксируйте исходное состояние растения для последующего сравнения в динамике.', es: 'Registre el estado de referencia para realizar comparaciones a lo largo del tiempo.', de: 'Den Ausgangszustand für einen späteren Verlaufsvergleich dokumentieren.' },
  'steps.stress.1': { en: 'Physiological stress indicators present — check soil pH (optimal 4.5–5.5) and moisture levels.', ru: 'Выявлены признаки физиологического стресса. Проверьте кислотность почвы (оптимально pH 4,5–5,5) и уровень влажности.', es: 'Se observan indicadores de estrés fisiológico. Compruebe el pH del suelo (óptimo 4,5–5,5) y el nivel de humedad.', de: 'Anzeichen für physiologischen Stress liegen vor. Boden-pH (optimal 4,5–5,5) und Bodenfeuchte überprüfen.' },
  'steps.stress.2': { en: 'Evaluate nitrogen and iron availability; chlorosis may indicate nutrient deficiency.', ru: 'Оцените доступность азота и железа: хлороз может свидетельствовать о дефиците питательных веществ.', es: 'Evalúe la disponibilidad de nitrógeno y hierro: la clorosis puede ser señal de deficiencia nutricional.', de: 'Verfügbarkeit von Stickstoff und Eisen prüfen: Chlorose kann auf einen Nährstoffmangel hindeuten.' },
  'steps.stress.3': { en: 'Adjust irrigation schedule — blueberry requires 25–50 mm water/week during vegetation.', ru: 'Скорректируйте график полива: в период вегетации голубике требуется 25–50 мм воды в неделю.', es: 'Ajuste el calendario de riego: durante la fase vegetativa el arándano necesita entre 25 y 50 mm de agua a la semana.', de: 'Bewässerungsplan anpassen: Während der Vegetationsphase benötigt die Heidelbeere 25–50 mm Wasser pro Woche.' },
  'steps.stress.4': { en: 'Re-scan in 3–5 days to assess dynamics of symptom progression.', ru: 'Повторите сканирование через 3–5 дней, чтобы оценить динамику симптомов.', es: 'Repita el escaneo en 3–5 días para evaluar la evolución de los síntomas.', de: 'In 3–5 Tagen erneut scannen, um den Verlauf der Symptome zu beurteilen.' },
  'steps.mold.1': { en: 'Fungal infection detected. Apply systemic fungicide (e.g., propiconazole or azoxystrobin) within 48 hours.', ru: 'Выявлена грибковая инфекция. В течение 48 часов проведите обработку системным фунгицидом (например, пропиконазолом или азоксистробином).', es: 'Se detecta una infección fúngica. Aplique un fungicida sistémico (por ejemplo, propiconazol o azoxistrobina) en las próximas 48 horas.', de: 'Pilzbefall festgestellt. Innerhalb von 48 Stunden mit einem systemischen Fungizid (z. B. Propiconazol oder Azoxystrobin) behandeln.' },
  'steps.mold.2': { en: 'Remove and dispose of heavily affected leaves to reduce spore load.', ru: 'Удалите сильно поражённые листья и утилизируйте их, чтобы снизить споровую нагрузку.', es: 'Retire y deseche las hojas más afectadas para reducir la carga de esporas.', de: 'Stark befallene Blätter entfernen und entsorgen, um den Sporendruck zu verringern.' },
  'steps.mold.3': { en: 'Increase plant spacing and prune lower branches to improve air circulation.', ru: 'Увеличьте расстояние между кустами и обрежьте нижние ветви, чтобы улучшить циркуляцию воздуха.', es: 'Aumente la distancia entre plantas y pode las ramas inferiores para mejorar la ventilación del cultivo.', de: 'Den Pflanzabstand vergrößern und die unteren Äste zurückschneiden, um die Luftzirkulation zu verbessern.' },
  'steps.mold.4': { en: 'Inspect adjacent plants within a 2–3 m radius for early signs of spread.', ru: 'Осмотрите соседние кусты в радиусе 2–3 м на предмет ранних признаков распространения инфекции.', es: 'Revise las plantas vecinas en un radio de 2–3 m para detectar signos tempranos de propagación.', de: 'Benachbarte Pflanzen im Umkreis von 2–3 m auf frühe Anzeichen einer Ausbreitung untersuchen.' },
  'steps.mold.5': { en: 'Avoid overhead irrigation — use drip system to keep foliage dry.', ru: 'Откажитесь от дождевания: используйте капельный полив, чтобы листва оставалась сухой.', es: 'Evite el riego por aspersión: utilice riego por goteo para mantener el follaje seco.', de: 'Auf Überkopfbewässerung verzichten und stattdessen Tropfbewässerung einsetzen, damit das Laub trocken bleibt.' },
  'steps.dry.1': { en: 'Tissue necrosis and dehydration observed. Increase watering frequency immediately (daily in hot periods).', ru: 'Выявлены некроз тканей и обезвоживание. Незамедлительно увеличьте частоту полива (в жаркие дни — ежедневно).', es: 'Se observan necrosis tisular y deshidratación. Aumente de inmediato la frecuencia de riego (a diario en días calurosos).', de: 'Gewebenekrose und Austrocknung festgestellt. Bewässerungshäufigkeit umgehend erhöhen (in Hitzeperioden täglich).' },
  'steps.dry.2': { en: 'Inspect root zone for compaction or damage that may impair water uptake.', ru: 'Проверьте прикорневую зону на уплотнение почвы и повреждения, способные нарушать поглощение воды.', es: 'Inspeccione la zona radicular en busca de compactación o daños que puedan dificultar la absorción de agua.', de: 'Den Wurzelbereich auf Bodenverdichtung oder Schäden prüfen, die die Wasseraufnahme beeinträchtigen könnten.' },
  'steps.dry.3': { en: 'Apply organic mulch (5–10 cm layer) around the base to retain soil moisture.', ru: 'Замульчируйте приствольный круг органической мульчей слоем 5–10 см, чтобы удержать влагу в почве.', es: 'Aplique acolchado orgánico (capa de 5–10 cm) alrededor de la base para conservar la humedad del suelo.', de: 'Eine 5–10 cm dicke Schicht organischen Mulchs um den Wurzelbereich ausbringen, um die Bodenfeuchte zu erhalten.' },
  'steps.dry.4': { en: 'Provide temporary shade netting during peak solar radiation hours (11:00–15:00).', ru: 'В часы пиковой солнечной активности (11:00–15:00) установите временную затеняющую сетку.', es: 'Coloque una malla de sombreo temporal durante las horas de máxima radiación solar (11:00–15:00).', de: 'In den Stunden mit der stärksten Sonneneinstrahlung (11:00–15:00) ein temporäres Schattennetz spannen.' },
  'steps.dry.5': { en: 'Monitor recovery over the next 7 days; persistent necrosis may indicate irreversible tissue damage.', ru: 'В течение ближайших 7 дней отслеживайте восстановление: сохраняющийся некроз может указывать на необратимое повреждение тканей.', es: 'Realice un seguimiento de la recuperación durante los próximos 7 días: la necrosis persistente puede indicar un daño tisular irreversible.', de: 'Die Erholung über die nächsten 7 Tage hinweg beobachten: Anhaltende Nekrose kann auf irreversible Gewebeschäden hindeuten.' },
} as const;

export type TranslationKey = keyof typeof translations;

export interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
}

export const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function useLocale(): LocaleContextType {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}

export function translate(key: TranslationKey, locale: Locale): string {
  return translations[key]?.[locale] ?? key;
}
