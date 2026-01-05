import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { AppConfig } from 'src/app.config';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

/**
 * Utility class for encrypting and decrypting sensitive data like passwords.
 * Uses AES-256-GCM encryption with a secret key from environment variables.
 */
export class EncryptionUtils {
    private static readonly ALGORITHM = 'aes-256-gcm';
    private static readonly IV_LENGTH = 16; // For GCM mode
    private static readonly SALT_LENGTH = 32;
    private static readonly TAG_LENGTH = 16;
    private static readonly KEY_LENGTH = 32; // 256 bits

    /**
     * Get the encryption key from environment variable
     * IMPORTANT: Set ENCRYPTION_SECRET in your .env file (minimum 32 characters)
     */
    private static getSecretKey(): string {
        const secret = AppConfig.encryptionSecret;
        if (!secret || secret.length < 32) {
            throw new Error(
                'ENCRYPTION_SECRET must be set in environment variables and be at least 32 characters long'
            );
        }
        return secret;
    }

    /**
     * Derive a cryptographic key from the secret using scrypt
     */
    private static async deriveKey(secret: string, salt: Buffer): Promise<Buffer> {
        return (await scryptAsync(secret, salt, EncryptionUtils.KEY_LENGTH)) as Buffer;
    }

    /**
     * Encrypt a plaintext string
     * @param plaintext - The text to encrypt (e.g., password)
     * @returns Encrypted string in format: salt:iv:encrypted:authTag (base64 encoded)
     */
    public static async encrypt(plaintext: string): Promise<string> {
        if (!plaintext) {
            throw new Error('Cannot encrypt empty string');
        }

        const secret = EncryptionUtils.getSecretKey();

        // Generate random salt and IV
        const salt = randomBytes(EncryptionUtils.SALT_LENGTH);
        const iv = randomBytes(EncryptionUtils.IV_LENGTH);

        // Derive key from secret + salt
        const key = await EncryptionUtils.deriveKey(secret, salt);

        // Create cipher
        const cipher = createCipheriv(EncryptionUtils.ALGORITHM, key, iv);

        // Encrypt the plaintext
        let encrypted = cipher.update(plaintext, 'utf8', 'base64');
        encrypted += cipher.final('base64');

        // Get authentication tag (GCM mode)
        const authTag = cipher.getAuthTag();

        // Combine salt:iv:encrypted:authTag (all base64 encoded)
        return [
            salt.toString('base64'),
            iv.toString('base64'),
            encrypted,
            authTag.toString('base64'),
        ].join(':');
    }

    /**
     * Decrypt an encrypted string
     * @param encryptedData - The encrypted string (format: salt:iv:encrypted:authTag)
     * @returns Decrypted plaintext string
     */
    public static async decrypt(encryptedData: string): Promise<string> {
        if (!encryptedData) {
            throw new Error('Cannot decrypt empty string');
        }

        const secret = EncryptionUtils.getSecretKey();

        // Split the encrypted data
        const parts = encryptedData.split(':');
        if (parts.length !== 4) {
            throw new Error('Invalid encrypted data format');
        }

        const [saltBase64, ivBase64, encrypted, authTagBase64] = parts;

        // Decode from base64
        const salt = Buffer.from(saltBase64, 'base64');
        const iv = Buffer.from(ivBase64, 'base64');
        const authTag = Buffer.from(authTagBase64, 'base64');

        // Derive key from secret + salt
        const key = await EncryptionUtils.deriveKey(secret, salt);

        // Create decipher
        const decipher = createDecipheriv(EncryptionUtils.ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        // Decrypt
        let decrypted = decipher.update(encrypted, 'base64', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }

    /**
     * Check if a string is already encrypted
     * @param value - The value to check
     * @returns true if the value appears to be encrypted
     */
    public static isEncrypted(value: string): boolean {
        if (!value) return false;
        const parts = value.split(':');
        return parts.length === 4;
    }
}
