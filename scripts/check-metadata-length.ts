#!/usr/bin/env tsx
/**
 * メタデータの各項目がCardanoの64バイト制限を超えていないかチェックするスクリプト
 * 
 * Usage:
 *   npx tsx scripts/check-metadata-length.ts
 *   npx tsx scripts/check-metadata-length.ts --file public/data/projects.json
 *   npx tsx scripts/check-metadata-length.ts --file public/data/dev-projects.json
 */

import * as fs from 'fs';
import * as path from 'path';

const MAX_BYTE_LENGTH = 64;

interface MetadataField {
  key: string;
  value: string | number | unknown;
  byteLength: number;
  path: string;
}

interface ValidationResult {
  projectId: string;
  projectTitle: string;
  errors: MetadataField[];
  warnings: MetadataField[];
}

/**
 * 文字列のバイト長を計算（UTF-8エンコーディング）
 */
function getByteLength(str: string): number {
  return new TextEncoder().encode(str).length;
}

/**
 * IPFS URLからCIDのみを抽出（実際のメタデータではipfs://プレフィックスが削除される）
 */
function extractIpfsCid(ipfsUrl: string): string {
  if (!ipfsUrl) return ipfsUrl;
  if (ipfsUrl.startsWith('ipfs://')) {
    return ipfsUrl.replace('ipfs://', '');
  }
  return ipfsUrl;
}

/**
 * メタデータオブジェクトを再帰的にチェック
 */
function checkMetadataFields(
  obj: unknown,
  prefix: string = '',
  results: MetadataField[] = []
): MetadataField[] {
  if (obj === null || obj === undefined) {
    return results;
  }

  if (typeof obj === 'string') {
    // imageフィールドの場合は、ipfs://プレフィックスを削除してチェック
    let valueToCheck = obj;
    if (prefix.includes('image') && obj.startsWith('ipfs://')) {
      valueToCheck = extractIpfsCid(obj);
    }
    
    const byteLength = getByteLength(valueToCheck);
    if (byteLength > MAX_BYTE_LENGTH) {
      results.push({
        key: prefix || 'value',
        value: obj,
        byteLength,
        path: prefix,
      });
    }
    return results;
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    // 数値や真偽値は文字列に変換してチェック
    const str = String(obj);
    const byteLength = getByteLength(str);
    if (byteLength > MAX_BYTE_LENGTH) {
      results.push({
        key: prefix || 'value',
        value: str,
        byteLength,
        path: prefix,
      });
    }
    return results;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      checkMetadataFields(item, `${prefix}[${index}]`, results);
    });
    return results;
  }

  if (typeof obj === 'object') {
    Object.entries(obj).forEach(([key, value]) => {
      const newPrefix = prefix ? `${prefix}.${key}` : key;
      checkMetadataFields(value, newPrefix, results);
    });
    return results;
  }

  return results;
}

/**
 * プロジェクトのメタデータを検証
 */
function validateProjectMetadata(project: any): ValidationResult {
  const projectId = project.id || 'unknown';
  const projectTitle = project.title || 'Unknown Project';
  const errors: MetadataField[] = [];
  const warnings: MetadataField[] = [];

  // metadataオブジェクト内のフィールドのみをチェック
  // project.descriptionはフロントエンド表示用のためチェック不要
  if (project.metadata) {
    const metadataIssues = checkMetadataFields(project.metadata, 'metadata');
    // metadata内のフィールドはエラーとして扱う（直接メタデータに使用されるため）
    errors.push(...metadataIssues);
  }

  return {
    projectId,
    projectTitle,
    errors,
    warnings,
  };
}

/**
 * メイン処理
 */
function main() {
  const args = process.argv.slice(2);
  let filePath: string;

  // コマンドライン引数からファイルパスを取得
  const fileIndex = args.indexOf('--file');
  if (fileIndex !== -1 && args[fileIndex + 1]) {
    filePath = args[fileIndex + 1];
  } else {
    // デフォルトで両方のファイルをチェック
    const projectsPath = path.join(process.cwd(), 'public', 'data', 'projects.json');
    const devProjectsPath = path.join(process.cwd(), 'public', 'data', 'dev-projects.json');

    console.log('Checking metadata length limits (64 bytes max)...\n');
    console.log('='.repeat(80));

    // projects.jsonをチェック
    if (fs.existsSync(projectsPath)) {
      console.log('\n📄 Checking: projects.json');
      console.log('-'.repeat(80));
      checkFile(projectsPath);
    }

    // dev-projects.jsonをチェック
    if (fs.existsSync(devProjectsPath)) {
      console.log('\n📄 Checking: dev-projects.json');
      console.log('-'.repeat(80));
      checkFile(devProjectsPath);
    }

    return;
  }

  // 指定されたファイルをチェック
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: File not found: ${filePath}`);
    process.exit(1);
  }

  console.log('Checking metadata length limits (64 bytes max)...\n');
  console.log('='.repeat(80));
  checkFile(filePath);
}

/**
 * ファイルをチェック
 */
function checkFile(filePath: string) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const projects = JSON.parse(fileContent) as any[];

    if (!Array.isArray(projects)) {
      console.error('❌ Error: JSON file must contain an array of projects');
      process.exit(1);
    }

    let totalErrors = 0;
    let totalWarnings = 0;

    projects.forEach((project, index) => {
      const result = validateProjectMetadata(project);

      if (result.errors.length > 0 || result.warnings.length > 0) {
        console.log(`\n🔍 Project ${index + 1}: ${result.projectTitle} (ID: ${result.projectId})`);

        // エラーを表示
        if (result.errors.length > 0) {
          console.log('\n  ❌ ERRORS (will cause minting to fail):');
          result.errors.forEach((error) => {
            console.log(`    - ${error.path}: ${error.byteLength} bytes (max: ${MAX_BYTE_LENGTH})`);
            console.log(`      Value: "${String(error.value).substring(0, 60)}${String(error.value).length > 60 ? '...' : ''}"`);
          });
          totalErrors += result.errors.length;
        }

        // 警告を表示
        if (result.warnings.length > 0) {
          console.log('\n  ⚠️  WARNINGS (may be used as fallback):');
          result.warnings.forEach((warning) => {
            console.log(`    - ${warning.path}: ${warning.byteLength} bytes (max: ${MAX_BYTE_LENGTH})`);
            console.log(`      Value: "${String(warning.value).substring(0, 60)}${String(warning.value).length > 60 ? '...' : ''}"`);
          });
          totalWarnings += result.warnings.length;
        }
      }
    });

    // サマリーを表示
    console.log('\n' + '='.repeat(80));
    if (totalErrors === 0 && totalWarnings === 0) {
      console.log('✅ All metadata fields are within the 64-byte limit!');
    } else {
      console.log(`\n📊 Summary:`);
      console.log(`   Total errors: ${totalErrors}`);
      console.log(`   Total warnings: ${totalWarnings}`);
      if (totalErrors > 0) {
        console.log('\n❌ Please fix the errors before minting NFTs.');
        process.exit(1);
      }
    }
  } catch (error) {
    console.error('❌ Error reading or parsing file:', error);
    process.exit(1);
  }
}

// スクリプトを実行
main();

