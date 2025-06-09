#!/bin/bash

# Script para corregir todas las importaciones de authOptions
find ./src -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i '' "s|import { authOptions } from '@/app/api/auth/\[...nextauth\]/route';|import { authOptions } from '@/lib/auth';|g"
