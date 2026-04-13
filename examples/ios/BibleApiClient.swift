// ============================================================
// Bible Mirror API — iOS Swift Client
// ============================================================
// SPM: firebase-ios-sdk → FirebaseAuth
// ============================================================

import Foundation
import FirebaseAuth

enum BibleApiConfig {
    // Ganti dengan URL Worker Anda setelah deploy
    static let baseURL = "https://bible-mirror-api.<your-subdomain>.workers.dev"
}

struct ApiMeta: Decodable { let cached: Bool; let timestamp: String; let version: String }
struct ApiSuccess<T: Decodable>: Decodable { let ok: Bool; let data: T; let meta: ApiMeta }
struct ApiErrorDetail: Decodable { let code: String; let message: String; let status: Int }
struct ApiErrorResponse: Decodable { let ok: Bool; let error: ApiErrorDetail }

enum ApiResult<T> {
    case success(data: T, meta: ApiMeta)
    case failure(code: String, message: String, status: Int)
    case networkError(Error)
}

actor BibleApiClient {
    private let session: URLSession
    private let decoder: JSONDecoder

    init(session: URLSession = .shared) {
        self.session = session
        self.decoder = JSONDecoder()
    }

    private func getIdToken() async throws -> String {
        guard let user = Auth.auth().currentUser else { throw URLError(.userAuthenticationRequired) }
        return try await user.getIDToken()
    }

    private func get<T: Decodable>(path: String, as type: T.Type) async -> ApiResult<T> {
        do {
            let token = try await getIdToken()
            guard let url = URL(string: "\(BibleApiConfig.baseURL)\(path)") else {
                return .failure(code: "BAD_REQUEST", message: "Invalid URL", status: 400)
            }
            var req = URLRequest(url: url)
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            req.setValue("application/json", forHTTPHeaderField: "Accept")
            req.timeoutInterval = 15
            let (data, _) = try await session.data(for: req)
            if let success = try? decoder.decode(ApiSuccess<T>.self, from: data) {
                return .success(data: success.data, meta: success.meta)
            }
            if let err = try? decoder.decode(ApiErrorResponse.self, from: data) {
                return .failure(code: err.error.code, message: err.error.message, status: err.error.status)
            }
            return .failure(code: "INTERNAL_ERROR", message: "Unexpected response", status: 500)
        } catch { return .networkError(error) }
    }

    func ping() async -> ApiResult<[String: String]> { await get(path: "/api/v1/ping", as: [String: String].self) }
    func me() async -> ApiResult<[String: String]> { await get(path: "/api/v1/me", as: [String: String].self) }
    func getBibles() async -> ApiResult<[String: AnyDecodable]> { await get(path: "/api/v1/bibles", as: [String: AnyDecodable].self) }
    func getBible(bibleId: Int) async -> ApiResult<[String: AnyDecodable]> { await get(path: "/api/v1/bibles/\(bibleId)", as: [String: AnyDecodable].self) }
    func getBooks(bibleId: Int) async -> ApiResult<[String: AnyDecodable]> { await get(path: "/api/v1/bibles/\(bibleId)/books", as: [String: AnyDecodable].self) }
    func getChapters(bibleId: Int, bookUsfm: String) async -> ApiResult<[String: AnyDecodable]> { await get(path: "/api/v1/bibles/\(bibleId)/books/\(bookUsfm)/chapters", as: [String: AnyDecodable].self) }
    func getChapter(bibleId: Int, chapterUsfm: String) async -> ApiResult<[String: AnyDecodable]> { await get(path: "/api/v1/bibles/\(bibleId)/chapters/\(chapterUsfm)", as: [String: AnyDecodable].self) }
    func getVerseList(bibleId: Int, chapterUsfm: String) async -> ApiResult<[String: AnyDecodable]> { await get(path: "/api/v1/bibles/\(bibleId)/chapters/\(chapterUsfm)/verses", as: [String: AnyDecodable].self) }
    func getVerse(bibleId: Int, verseUsfm: String) async -> ApiResult<[String: AnyDecodable]> { await get(path: "/api/v1/bibles/\(bibleId)/verses/\(verseUsfm)", as: [String: AnyDecodable].self) }
    func getPassage(bibleId: Int, reference: String) async -> ApiResult<[String: AnyDecodable]> { await get(path: "/api/v1/bibles/\(bibleId)/passages/\(reference)", as: [String: AnyDecodable].self) }
    func getLanguages() async -> ApiResult<[String: AnyDecodable]> { await get(path: "/api/v1/languages", as: [String: AnyDecodable].self) }
    func getVotdToday() async -> ApiResult<[String: AnyDecodable]> { await get(path: "/api/v1/votd/today", as: [String: AnyDecodable].self) }
    func getVotdDay(year: Int, day: Int) async -> ApiResult<[String: AnyDecodable]> { await get(path: "/api/v1/votd/\(year)/\(day)", as: [String: AnyDecodable].self) }
}

// Helper untuk decode JSON dinamis
struct AnyDecodable: Decodable {
    let value: Any
    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if let v = try? c.decode(String.self) { value = v }
        else if let v = try? c.decode(Int.self) { value = v }
        else if let v = try? c.decode(Double.self) { value = v }
        else if let v = try? c.decode(Bool.self) { value = v }
        else if let v = try? c.decode([String: AnyDecodable].self) { value = v }
        else if let v = try? c.decode([AnyDecodable].self) { value = v }
        else { value = NSNull() }
    }
}
