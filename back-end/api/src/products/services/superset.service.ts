import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import axios, { AxiosInstance } from "axios";
import { AppConfig } from "src/app.config";

interface GuestTokenRls {
    clause: string;
}

@Injectable()
export class SupersetService {
      private readonly logger = new Logger(SupersetService.name);
      
    private readonly client: AxiosInstance;
    private accessToken: string | null = null;
    private tokenExpiresAt: number = 0;

    constructor() {
        const { host, port } = AppConfig.superset;
        this.client = axios.create({
            baseURL: `http://${host}:${port}`,
            timeout: 10_000,
        });
    }

    async generateGuestToken(dashboardUuid: string, rls: GuestTokenRls[]): Promise<string> {
        if (!AppConfig.superset.enabled) {
            throw new ServiceUnavailableException("Climate Products (Superset) is not enabled on this server.");
        }

        const accessToken = await this.getAccessToken();
        const { csrfToken, sessionCookie } = await this.fetchCsrfToken(accessToken);

        try {
            const response = await this.client.post(
                "/api/v1/security/guest_token/",
                {
                    user: { username: "climsoft_guest", first_name: "Climsoft", last_name: "User" },
                    resources: [{ type: "dashboard", id: dashboardUuid }],
                    rls,
                },
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "X-CSRFToken": csrfToken,
                        Referer: `http://${AppConfig.superset.host}:${AppConfig.superset.port}`,
                        ...(sessionCookie ? { Cookie: sessionCookie } : {}),
                    },
                }
            );
            this.logger.log(`Successfully generated Superset guest token for dashboard ${dashboardUuid}`);
            return response.data.token;
        } catch (error: any) {
            const detail = error?.response?.data ?? error?.message;
            this.logger.error("Failed to generate Superset guest token. Status:", error?.response?.status, "Body:", JSON.stringify(detail));
            throw new ServiceUnavailableException("Could not generate access token for Climate Product.");
        }
    }

    private async getAccessToken(): Promise<string> {
        if (this.accessToken && Date.now() < this.tokenExpiresAt) {
            return this.accessToken;
        }

        const { serviceUsername, servicePassword } = AppConfig.superset;

        try {
            const response = await this.client.post("/api/v1/security/login", {
                username: serviceUsername,
                password: servicePassword,
                provider: "db",
                refresh: true,
            });

            this.accessToken = response.data.access_token;
            // Superset access tokens expire in 1 hour — refresh 5 minutes early
            this.tokenExpiresAt = Date.now() + (55 * 60 * 1000);
            return this.accessToken!;
        } catch (error: any) {
            const detail = error?.response?.data ?? error?.message;
            this.logger.error("Failed to authenticate with Superset. Status:", error?.response?.status, "Body:", JSON.stringify(detail));
            throw new ServiceUnavailableException("Could not connect to Climate Products service.");
        }
    }

      private async fetchCsrfToken(accessToken: string): Promise<{ csrfToken: string; sessionCookie: string | null }> {
        try {
            const response = await this.client.get("/api/v1/security/csrf_token/", {
                headers: { Authorization: `Bearer ${accessToken}` },
            }); 
            const cookies: string[] = response.headers["set-cookie"] ?? [];
            const sessionEntry = cookies.find(c => c.startsWith("session="));
            const sessionCookie = sessionEntry ? sessionEntry.split(";")[0] : null;
            return { csrfToken: response.data.result, sessionCookie };
        } catch (error: any) {
            const detail = error?.response?.data ?? error?.message;
            this.logger.error("Failed to fetch CSRF token from Superset. Status:", error?.response?.status, "Body:", JSON.stringify(detail));
            throw new ServiceUnavailableException("Could not connect to Climate Products service.");
        }
    }
}
