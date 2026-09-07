<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('units', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sector_id')->constrained('sectors')->restrictOnDelete();
            $table->foreignId('price_rule_id')->nullable()->constrained('price_rules')->nullOnDelete();
            $table->string('name', 100);
            $table->unsignedInteger('rooms_count')->default(1);
            $table->timestamps();

            $table->unique(['sector_id', 'name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('units');
    }
};
