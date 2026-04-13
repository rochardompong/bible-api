// ============================================================
// Bible Mirror API — Android Kotlin Client
// ============================================================
// build.gradle.kts dependencies:
//   implementation(platform("com.google.firebase:firebase-bom:32.7.0"))
//   implementation("com.google.firebase:firebase-auth-ktx")
//   implementation("com.squareup.okhttp3:okhttp:4.12.0")
// ============================================================

package com.yourapp.bible.api

import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.tasks.await
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.io.IOException

object BibleApiConfig {
    // Ganti dengan URL Worker Anda setelah deploy
    const val BASE_URL = "https://bible-mirror-api.<your-subdomain>.workers.dev"
}

data class ApiMeta(val cached: Boolean, val timestamp: String, val version: String)

sealed class ApiResult<out T> {
    data class Success<T>(val data: T, val meta: ApiMeta) : ApiResult<T>()
    data class Error(val code: String, val message: String, val status: Int) : ApiResult<Nothing>()
    data class NetworkError(val throwable: Throwable) : ApiResult<Nothing>()
}

class BibleApiClient(
    private val auth: FirebaseAuth = FirebaseAuth.getInstance(),
    private val http: OkHttpClient = OkHttpClient(),
) {
    private suspend fun getIdToken(): String {
        val user = auth.currentUser ?: throw IllegalStateException("User not signed in")
        return user.getIdToken(false).await().token ?: throw IllegalStateException("Token null")
    }

    private suspend fun get(path: String): ApiResult<JSONObject> {
        val token = try { getIdToken() } catch (e: Exception) {
            return ApiResult.Error("UNAUTHORIZED", e.message ?: "Auth failed", 401)
        }
        val request = Request.Builder()
            .url("${BibleApiConfig.BASE_URL}$path")
            .header("Authorization", "Bearer $token")
            .header("Accept", "application/json")
            .build()
        return try {
            val response = http.newCall(request).execute()
            val body = response.body?.string() ?: "{}"
            val json = JSONObject(body)
            if (json.optBoolean("ok", false)) {
                val meta = json.getJSONObject("meta").let {
                    ApiMeta(it.optBoolean("cached"), it.optString("timestamp"), it.optString("version"))
                }
                ApiResult.Success(json.getJSONObject("data"), meta)
            } else {
                val err = json.getJSONObject("error")
                ApiResult.Error(err.optString("code", "INTERNAL_ERROR"), err.optString("message"), err.optInt("status", 500))
            }
        } catch (e: IOException) { ApiResult.NetworkError(e) }
    }

    suspend fun ping() = get("/api/v1/ping")
    suspend fun me() = get("/api/v1/me")
    suspend fun getBibles() = get("/api/v1/bibles")
    suspend fun getBible(bibleId: Int) = get("/api/v1/bibles/$bibleId")
    suspend fun getBooks(bibleId: Int) = get("/api/v1/bibles/$bibleId/books")
    suspend fun getBook(bibleId: Int, bookUsfm: String) = get("/api/v1/bibles/$bibleId/books/$bookUsfm")
    suspend fun getChapters(bibleId: Int, bookUsfm: String) = get("/api/v1/bibles/$bibleId/books/$bookUsfm/chapters")
    suspend fun getChapter(bibleId: Int, chapterUsfm: String) = get("/api/v1/bibles/$bibleId/chapters/$chapterUsfm")
    suspend fun getVerseList(bibleId: Int, chapterUsfm: String) = get("/api/v1/bibles/$bibleId/chapters/$chapterUsfm/verses")
    suspend fun getVerse(bibleId: Int, verseUsfm: String) = get("/api/v1/bibles/$bibleId/verses/$verseUsfm")
    suspend fun getPassage(bibleId: Int, reference: String) = get("/api/v1/bibles/$bibleId/passages/$reference")
    suspend fun getBibleIndex(bibleId: Int) = get("/api/v1/bibles/$bibleId/index")
    suspend fun getLanguages() = get("/api/v1/languages")
    suspend fun getLanguage(langId: Int) = get("/api/v1/languages/$langId")
    suspend fun getVotdToday() = get("/api/v1/votd/today")
    suspend fun getVotdYear(year: Int) = get("/api/v1/votd/$year")
    suspend fun getVotdDay(year: Int, day: Int) = get("/api/v1/votd/$year/$day")
}

// Contoh penggunaan di ViewModel:
//
// class HomeViewModel : ViewModel() {
//     private val api = BibleApiClient()
//     fun loadVotd() = viewModelScope.launch {
//         when (val r = api.getVotdToday()) {
//             is ApiResult.Success -> { /* r.data.getString("text") */ }
//             is ApiResult.Error   -> { if (r.code == "UNAUTHORIZED") { /* redirect login */ } }
//             is ApiResult.NetworkError -> { /* tampilkan pesan offline */ }
//         }
//     }
// }
