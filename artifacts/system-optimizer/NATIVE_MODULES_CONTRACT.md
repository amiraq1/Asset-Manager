# دليل المعمارية التقنية لمشروع "نبض" (Nabd)

> هذا الملف هو **العقد الرسمي** بين طبقة JavaScript الموجودة الآن وطبقة Kotlin
> التي ستُبنى داخل Android Studio. أي وحدة Kotlin تُنفّذ بالأسماء والتواقيع
> المذكورة هنا ستعمل تلقائياً مع الواجهة دون أي تعديل في كود JS.

المشروع يعتمد معمارية **Bridge-First**: منطق الواجهة منفصل تماماً عن تنفيذ
العمليات الحساسة، ويتواصلان عبر جسور برمجية (Native Modules).

---

## 🏗️ الهيكل العام

| المسار | الدور |
|---|---|
| `app/` | شاشات Expo Router والتنقّل بين التبويبات. |
| `services/` | عقل JS — تجهيز البيانات وتدقيقها قبل إرسالها للجسر. |
| `android/` (بعد الـ Eject) | ملفات Kotlin لتنفيذ العمليات العميقة. |

كل ملف خدمة في `services/` يحتوي تعليقاً يوثّق الجسر المتوقَّع، فإذا غاب
الجسر يعمل التطبيق بقيم احتياطية مُفصَح عنها بصراحة في الواجهة.

---

## 🔌 العقود البرمجية للجسور

### 1. `RootShell` — تنفيذ أوامر Shell بصلاحيات Root أو Shizuku

| الدالة | المُدخلات | المُخرجات | الوصف |
|---|---|---|---|
| `isAvailable()` | — | `Boolean` | هل الجهاز مروت أو Shizuku مفعّل؟ |
| `forceStopApp(packageName: String)` | اسم الحزمة | `Boolean` | تنفيذ `am force-stop`. |
| `clearAppCache(packageName: String)` | اسم الحزمة | `Boolean` | تنفيذ `rm -rf` لمجلد الـ cache. |

ملف JS المرجعي: `services/RootShell.ts` — يُلقي
`NativeModuleUnavailableError` بدل المحاكاة الصامتة، فالواجهة تعرض رسالة
"تتطلب الوحدة الأصلية" عند غياب الجسر.

### 2. `JunkScanner` — الوصول لمسارات النظام المحمية

| الدالة | المُدخلات | المُخرجات |
|---|---|---|
| `getDeepSystemJunk()` | — | قائمة عناصر `{ path, sizeBytes, category }` (مسح `Android/data` و `obb` و `LOST.DIR`). |
| `deleteFiles(paths: Array<String>)` | مصفوفة مسارات | `{ deletedCount, freedBytes }` |

ملف JS المرجعي: `services/JunkScanner.ts` — يدمج هذه النتائج مع نتائج فحص
ذاكرة التطبيق المؤقتة (الحقيقية عبر `expo-file-system`).

### 3. `DeviceStats` — قراءة بيانات الاستخدام الحقيقية من Kernel

| الدالة | المُدخلات | المُخرجات |
|---|---|---|
| `getRamUsage()` | — | `{ totalBytes, usedBytes }` (من `/proc/meminfo`). |
| `getInstalledApps()` | — | `Array<{ packageName, appName }>` (من `PackageManager`). |

ملف JS المرجعي: `services/DeviceStats.ts` — يُرجع قائمة احتياطية موسومة
`isFallback: true` عند غياب الجسر، ويستخدمها `services/TaskManager.ts` لتقدير
ذاكرة التطبيقات.

---

## 🛠️ تدفّق البيانات في عملية حسّاسة (مثال: تنظيف عميق)

1. **الواجهة**: يضغط المستخدم "تنظيف المحدّد".
2. **الخدمة** (`JunkScanner.ts`): تتحقّق من الصلاحيات وتفصل العناصر إلى آمنة (تُحذف عبر JS) ومقيَّدة (`requiresNative: true`).
3. **الجسر** (`RootShell` / `JunkScanner.deleteFiles`): يستلم المسارات المقيَّدة ويمرّرها إلى Kotlin.
4. **النظام** (Kotlin): يطلب صلاحية Root، ينفّذ `rm -rf`، يُعيد `{ deletedCount, freedBytes }`.
5. **التنبيه** (`ToastProvider`): يعرض للمستخدم الحجم المُحرَّر فعلياً.

---

## ⚠️ ملاحظات تنفيذ في Android Studio

- **الصلاحيات في `AndroidManifest.xml`**:
  - `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`
  - `PACKAGE_USAGE_STATS`
  - (راجع `services/DeepPermissions.ts` للقائمة الكاملة المعروضة في شاشة Onboarding.)
- **إدارة الخيوط**: نفِّذ كل عمليات الـ Shell في `Dispatchers.IO` لتجنّب ANR.
- **تنسيق البيانات**: استخدم `WritableNativeArray` و `WritableNativeMap` عند إعادة القوائم/الكائنات إلى React Native.
- **معالجة الأخطاء**: ارفض الـ Promise بـ `promise.reject("CODE", "message")` لتلتقطه الواجهة كـ Error عادي.

---

## 🧱 قالب Kotlin مختصر (للنسخ المباشر)

```kotlin
class RootShellModule(context: ReactApplicationContext) :
    ReactContextBaseJavaModule(context) {

  override fun getName() = "RootShell"

  @ReactMethod
  fun isAvailable(promise: Promise) {
    CoroutineScope(Dispatchers.IO).launch {
      promise.resolve(Shell.SU.available())
    }
  }

  @ReactMethod
  fun forceStopApp(packageName: String, promise: Promise) {
    CoroutineScope(Dispatchers.IO).launch {
      val ok = Shell.SU.run("am force-stop $packageName") != null
      promise.resolve(ok)
    }
  }

  @ReactMethod
  fun clearAppCache(packageName: String, promise: Promise) {
    CoroutineScope(Dispatchers.IO).launch {
      val ok = Shell.SU.run(
        "rm -rf /data/data/$packageName/cache/* " +
        "/data/data/$packageName/code_cache/* " +
        "/sdcard/Android/data/$packageName/cache/*"
      ) != null
      promise.resolve(ok)
    }
  }
}
```

سجّل الوحدة في `MainApplication.kt` ضمن `getPackages()` ثم أعد بناء APK —
ستلتقط الواجهة الجسر تلقائياً عبر `NativeModules.RootShell`.
